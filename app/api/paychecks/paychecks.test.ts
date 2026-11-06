import { beforeEach, describe, expect, it, vi } from "vitest";

// TKT-0411 / TKT-0413 (owner, 7 Nov 2026): the real route handler against a fake database.
//  - Unsend: a paycheck moved back to Draft loses its sent date AND its received mark, and the audit log says so with the old values kept.
//  - Generate Drafts never changes a paycheck that was already sent; a Draft still gets the new subject.
const state = { db: null as Record<string, unknown> | null, audit: [] as Record<string, unknown>[] };
vi.mock("@/lib/db", () => ({
  readDB: async () => JSON.parse(JSON.stringify(state.db)),
  writeDB: async (db: Record<string, unknown>) => { state.db = db; },
  nextId: async (db: { paychecks: { PaycheckID: string }[] }) => `PAY-${String(100 + db.paychecks.length)}`,
  deleteRecords: async () => {},
}));
vi.mock("@/lib/authz", () => ({
  requireManagement: () => ({ session: { userId: "MGT-1", userType: "Management" }, error: null }),
  requireSelfOrManagement: () => ({ session: { userId: "MGT-1", userType: "Management" }, error: null }),
}));
vi.mock("@/lib/logging", () => ({ logAudit: async (e: Record<string, unknown>) => { state.audit.push(e); } }));
vi.mock("@/lib/fxRates", () => ({
  getRateToINR: async (_db: unknown, c: string) => (c === "INR" ? 1 : c === "PKR" ? 0.3 : null),
  convertINRAmount: async (_db: unknown, inr: number, c: string) => (c === "INR" ? inr : c === "PKR" ? Math.round((inr / 0.3) * 100) / 100 : null),
}));

import { PATCH, POST } from "./route";

const patch = (body: unknown) => PATCH(new Request("http://x/api/paychecks", { method: "PATCH", body: JSON.stringify(body) }) as never);
const generate = (body: Record<string, unknown>) => POST(new Request("http://x/api/paychecks", { method: "POST", body: JSON.stringify({ action: "generate", year: 2026, month: 11, ...body }) }) as never);
const svc = (id: string, rate: Record<string, unknown>) => ({ ServiceID: id, Name: `Subject ${id}`, OptionalComponents: [{ Batches: [{ BatchID: `B-${id}`, BatchName: "B8", Rates: [{ RateID: `R-${id}`, Group: "Teacher", Currency: "PKR", ...rate }] }] }] });
const sched = (service: string, dates: string[]) => dates.map((d, i) => ({ ScheduleID: `SCH-${service}-${i}`, ServiceID: service, BatchID: `B-${service}`, Date: d, Duration: 1 }));
const enr = (id: string) => ({ UserID: "STF-1", ServiceID: id, BatchID: `B-${id}`, RateID: `R-${id}`, StartDate: "2026-09-01" });
const line = (id: string) => ({ ServiceID: id, BatchID: `B-${id}`, ScheduledHours: 2, AttendedHours: 2, Amount: 1000, Currency: "PKR" });
const pay = (o: Record<string, unknown> = {}) => ({ PaycheckID: "PAY-1", StaffID: "STF-1", Year: 2026, Month: 11, Currency: "PKR", Amount: 1000, INRAmount: 300, INRDue: 300, Status: "Sent", SentAt: "2026-11-30T00:00:00Z", StaffReceivedFlag: true, ReceivedAt: "2026-12-01T09:30:00.000Z", LineItems: [line("M")], ...o });
const base = (paychecks: unknown[]) => ({
  paychecks,
  users: [{ UserID: "STF-1", UserType: "Teacher", Currency: "PKR" }],
  services: [svc("M", { Rate: 1000, BillingType: "Monthly" }), svc("H", { Rate: 500, BillingType: "Hourly" })],
  enrollments: [enr("M"), enr("H")],
  scheduleItems: [...sched("M", ["2026-11-02", "2026-11-04"]), ...sched("H", ["2026-11-03", "2026-11-05"])],
  attendanceItems: [],
});
const paychecks = () => (state.db as { paychecks: Record<string, unknown>[] }).paychecks;
beforeEach(() => { state.audit = []; state.db = base([pay()]); });

describe("unsend a paycheck", () => {
  it("moves it to Draft, clears the sent date and the received mark", async () => {
    const res = await patch({ paycheckId: "PAY-1", status: "Draft" });
    expect(res.status).toBe(200);
    expect(paychecks()[0]).toMatchObject({ Status: "Draft", SentAt: "", StaffReceivedFlag: false, ReceivedAt: "" });
  });
  it("writes one audit line that says so, and keeps the old values in the snapshot", async () => {
    await patch({ paycheckId: "PAY-1", status: "Draft" });
    expect(state.audit).toHaveLength(1);
    const entry = state.audit[0] as { actorUserId: string; summary: string; snapshot: { before: Record<string, unknown>; after: Record<string, unknown> } };
    expect(entry.actorUserId).toBe("MGT-1");
    expect(entry.summary).toBe("Unsent paycheck PAY-1 (Sent to Draft) and cleared its received mark (received 2026-12-01)");
    expect(entry.snapshot.before).toMatchObject({ Status: "Sent", StaffReceivedFlag: true, ReceivedAt: "2026-12-01T09:30:00.000Z", SentAt: "2026-11-30T00:00:00Z" });
    expect(entry.snapshot.after).toMatchObject({ Status: "Draft", StaffReceivedFlag: false });
  });
  it("sending it again stamps a fresh sent date", async () => {
    await patch({ paycheckId: "PAY-1", status: "Draft" });
    await patch({ paycheckId: "PAY-1", status: "Sent" });
    expect(paychecks()[0]!.Status).toBe("Sent");
    expect(paychecks()[0]!.SentAt).not.toBe("2026-11-30T00:00:00Z");
    expect(paychecks()[0]!.StaffReceivedFlag).toBe(false);
  });
  it("unmarking received alone logs who did it and leaves the status", async () => {
    await patch({ paycheckId: "PAY-1", staffReceivedFlag: false });
    expect(paychecks()[0]).toMatchObject({ Status: "Sent", StaffReceivedFlag: false, ReceivedAt: "" });
    expect((state.audit[0] as { summary: string }).summary).toBe("Management unmarked paycheck PAY-1 as received");
  });
});

describe("Generate Drafts and a paycheck that was already sent (TKT-0413)", () => {
  it("leaves a Sent paycheck exactly as it was and says why for the subject it could not add", async () => {
    const before = JSON.stringify(paychecks()[0]);
    const res = await generate({});
    const body = await res.json();
    expect(JSON.stringify(paychecks()[0])).toBe(before);
    expect(paychecks()).toHaveLength(1);
    expect(body.skipped.some((s: { serviceId: string; reason: string }) => s.serviceId === "H" && /already Sent.*leaves it alone/.test(s.reason))).toBe(true);
  });
  it("still adds the missing subject to a Draft paycheck", async () => {
    state.db = base([pay({ Status: "Draft", SentAt: "", StaffReceivedFlag: false, ReceivedAt: "" })]);
    await generate({});
    const items = (paychecks()[0] as { LineItems: { ServiceID: string }[] }).LineItems.map((l) => l.ServiceID);
    expect(items.sort()).toEqual(["H", "M"]);
  });
});

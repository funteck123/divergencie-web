import { beforeEach, describe, expect, it, vi } from "vitest";

// The paycheck twin of the invoice carry-over (TKT-0406): the real route handler and the real hours/amount code against a fake database.
// Exchange rates are fixed (1 INR = 1 INR, 1 PKR = 0.3 INR).
const state = { db: null as Record<string, unknown> | null, written: [] as string[][], audit: [] as unknown[] };
vi.mock("@/lib/db", () => ({
  readDB: async () => JSON.parse(JSON.stringify(state.db)),
  writeDB: async (db: Record<string, unknown>, touched: string[]) => { state.db = db; state.written.push(touched); },
  nextId: async (db: { paychecks: { PaycheckID: string }[] }) => `PAY-${String(100 + db.paychecks.length)}`,
}));
vi.mock("@/lib/authz", () => ({ requireManagement: () => ({ session: { userId: "MGT-1", userType: "Management" }, error: null }) }));
vi.mock("@/lib/logging", () => ({ logAudit: async (e: unknown) => { state.audit.push(e); } }));
vi.mock("@/lib/fxRates", () => ({
  getRateToINR: async (_db: unknown, c: string) => (c === "INR" ? 1 : c === "PKR" ? 0.3 : null),
  convertINRAmount: async (_db: unknown, inr: number, c: string) => (c === "INR" ? inr : c === "PKR" ? Math.round((inr / 0.3) * 100) / 100 : null),
}));

import { POST } from "./route";

const post = (body: unknown) => POST(new Request("http://x/api/paychecks/carry-over", { method: "POST", body: JSON.stringify(body) }) as never);
const svc = (id: string, name: string, rate: Record<string, unknown>) => ({ ServiceID: id, Name: name, OptionalComponents: [{ Batches: [{ BatchID: `B-${id}`, BatchName: "B8", Rates: [{ RateID: `R-${id}`, Group: "Teacher", Currency: "PKR", ...rate }] }] }] });
const sched = (service: string, dates: string[]) => dates.map((d, i) => ({ ScheduleID: `SCH-${service}-${i}`, ServiceID: service, BatchID: `B-${service}`, Date: d, Duration: 1 }));
const enr = (id: string, o: Record<string, unknown> = {}) => ({ UserID: "STF-1", ServiceID: id, BatchID: `B-${id}`, RateID: `R-${id}`, StartDate: "2026-09-01", ...o });
const line = (id: string, amount: number) => ({ ServiceID: id, BatchID: `B-${id}`, ScheduledHours: 13, AttendedHours: 6.5, Amount: amount, Currency: "PKR" });
const pay = (o: Record<string, unknown> = {}) => ({ PaycheckID: "PAY-1", StaffID: "STF-1", Year: 2026, Month: 10, Currency: "PKR", Amount: 15000, INRAmount: 4500, INRDue: 4500, Status: "Sent", SentAt: "2026-10-31T00:00:00Z", StaffReceivedFlag: true, LineItems: [line("M", 15000)], ...o });
const base = (paychecks: unknown[], extra: Record<string, unknown> = {}) => ({
  paychecks,
  users: [{ UserID: "STF-1", Currency: "PKR" }],
  services: [svc("M", "Monthly Subject", { Rate: 30000, BillingType: "Monthly" }), svc("H", "Hourly Subject", { Rate: 1000, BillingType: "Hourly" }), svc("O", "One-off Subject", { Rate: 5000, BillingType: "OneOff" })],
  enrollments: [enr("M")],
  scheduleItems: sched("M", ["2026-11-02", "2026-11-04"]),
  attendanceItems: [],
  ...extra,
});
beforeEach(() => { state.written = []; state.audit = []; state.db = base([pay()]); });

describe("paycheck carry over to next month", () => {
  it("makes a Draft for next month priced at the current FULL monthly rate, not last month's amount", async () => {
    const res = await post({ paycheckId: "PAY-1" });
    const { paycheck } = await res.json();
    expect(res.status).toBe(200);
    expect(paycheck).toMatchObject({ StaffID: "STF-1", Year: 2026, Month: 11, Status: "Draft", Currency: "PKR", Amount: 30000, INRAmount: 9000, INRDue: 9000 });
    expect(paycheck.LineItems).toEqual([{ ServiceID: "M", BatchID: "B-M", ScheduledHours: 2, AttendedHours: null, Amount: 30000, Currency: "PKR" }]);
    for (const k of ["SentAt", "ReceivedAt", "StaffReceivedFlag"]) expect(paycheck[k]).toBeUndefined();
    expect(state.written).toEqual([["paychecks"]]);
    expect(state.audit.length).toBe(1);
  });
  it("prices an hourly subject at its rate times next month's scheduled hours", async () => {
    state.db = base([pay({ LineItems: [line("H", 6000)] })], { enrollments: [enr("H")], scheduleItems: sched("H", ["2026-11-02", "2026-11-03", "2026-11-04"]) });
    const { paycheck } = await (await post({ paycheckId: "PAY-1" })).json();
    expect(paycheck.LineItems[0]).toMatchObject({ ServiceID: "H", ScheduledHours: 3, AttendedHours: null, Amount: 3000 });
  });
  it("the source paycheck is left exactly as it was", async () => {
    await post({ paycheckId: "PAY-1" });
    expect((state.db as { paychecks: unknown[] }).paychecks[0]).toEqual(pay());
  });
  it("December carries over to January of the next year", async () => {
    state.db = base([pay({ Month: 12 })], { scheduleItems: sched("M", ["2027-01-05"]) });
    const { paycheck } = await (await post({ paycheckId: "PAY-1" })).json();
    expect([paycheck.Year, paycheck.Month]).toEqual([2027, 1]);
  });
  it("leaves out a subject whose enrollment has ended and names it", async () => {
    state.db = base([pay({ LineItems: [line("M", 15000), line("H", 6000)] })], { enrollments: [enr("M"), enr("H", { EndDate: "2026-10-31" })], scheduleItems: sched("M", ["2026-11-02"]) });
    const body = await (await post({ paycheckId: "PAY-1" })).json();
    expect(body.paycheck.LineItems.map((l: { ServiceID: string }) => l.ServiceID)).toEqual(["M"]);
    expect(body.skipped).toEqual(["Hourly Subject (enrollment ended 31/10/2026)"]);
  });
  it("leaves out a one-off rate and an hourly subject with no classes next month", async () => {
    state.db = base([pay({ LineItems: [line("M", 15000), line("O", 5000), line("H", 6000)] })], { enrollments: [enr("M"), enr("O"), enr("H")], scheduleItems: sched("M", ["2026-11-02"]) });
    const body = await (await post({ paycheckId: "PAY-1" })).json();
    expect(body.paycheck.LineItems.length).toBe(1);
    expect(body.skipped).toEqual(["One-off Subject (one-off rate, not repeated)", "Hourly Subject (no amount for 11/2026, no scheduled classes)"]);
  });
  it("makes nothing when every subject has ended, and says why", async () => {
    state.db = base([pay()], { enrollments: [enr("M", { EndDate: "2026-10-31" })] });
    const res = await post({ paycheckId: "PAY-1" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Monthly Subject (enrollment ended 31/10/2026)");
    expect(state.written).toEqual([]);
  });
  it("refuses when the staff member already has a paycheck for the next month", async () => {
    state.db = base([pay(), pay({ PaycheckID: "PAY-2", Month: 11 })]);
    const res = await post({ paycheckId: "PAY-1" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("PAY-2");
    expect(state.written).toEqual([]);
  });
  it("refuses a one-off paycheck, an unknown paycheck and a missing id", async () => {
    state.db = base([{ PaycheckID: "PAY-1", StaffID: "STF-1", ServiceID: "O", Year: 2026, Month: 10, Amount: 500, Currency: "PKR" }]);
    expect((await post({ paycheckId: "PAY-1" })).status).toBe(400);
    expect((await post({ paycheckId: "PAY-404" })).status).toBe(404);
    expect((await post({})).status).toBe(400);
    expect(state.written).toEqual([]);
  });
});

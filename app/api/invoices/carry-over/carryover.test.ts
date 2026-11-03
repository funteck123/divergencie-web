import { beforeEach, describe, expect, it, vi } from "vitest";

// TKT-0406: the real route handler against a fake database. Exchange rates are fixed (1 INR = 1 INR, 1 SAR = 25 INR).
const state = { db: null as Record<string, unknown> | null, written: [] as string[][], audit: [] as unknown[] };
vi.mock("@/lib/db", () => ({
  readDB: async () => JSON.parse(JSON.stringify(state.db)),
  writeDB: async (db: Record<string, unknown>, touched: string[]) => { state.db = db; state.written.push(touched); },
  nextId: async (db: { invoices: { InvoiceID: string }[] }) => `INV-${String(100 + db.invoices.length)}`,
  deleteRecords: async () => {},
}));
vi.mock("@/lib/authz", () => ({ requireManagement: () => ({ session: { userId: "MGT-1", userType: "Management" }, error: null }), }));
vi.mock("@/lib/logging", () => ({ logAudit: async (e: unknown) => { state.audit.push(e); } }));
vi.mock("@/lib/fxRates", () => ({
  getRateToINR: async (_db: unknown, c: string) => (c === "INR" ? 1 : c === "SAR" ? 25 : null),
  convertINRAmount: async (_db: unknown, inr: number, c: string) => (c === "INR" ? inr : c === "SAR" ? Math.round((inr / 25) * 100) / 100 : null),
}));

import { POST } from "./route";

const post = (body: unknown) => POST(new Request("http://x/api/invoices/carry-over", { method: "POST", body: JSON.stringify(body) }) as never);
const inv = (o: Record<string, unknown>) => ({ InvoiceID: "INV-1", StudentID: "STU-1", Year: 2026, Month: 10, Currency: "INR", Amount: 11340, INRAmount: 11340, INRDue: 11340, Status: "Sent", SentAt: "2026-10-01T00:00:00Z", StudentPaidFlag: true, PaidAt: "2026-10-07T00:00:00Z",
  LineItems: [{ ServiceID: "S1", BatchID: "B1", ScheduledHours: 13, AttendedHours: 9, Amount: 7560, Currency: "INR", Note: "old note" }, { ServiceID: "S2", BatchID: "B2", ScheduledHours: 5, AttendedHours: 5, Amount: 3780, Currency: "INR" }], ...o });

const enr = (o: Record<string, unknown>[] = [{}, {}]) => [{ UserID: "STU-1", ServiceID: "S1", BatchID: "B1", StartDate: "2026-10-01", ...o[0] }, { UserID: "STU-1", ServiceID: "S2", BatchID: "B2", StartDate: "2026-10-01", ...o[1] }];
const mk = (invoices: unknown[], enrollments = enr()) => ({ invoices, services: [{ ServiceID: "S1", Name: "Biology" }, { ServiceID: "S2", Name: "Chemistry" }], enrollments, users: [] });
beforeEach(() => { state.written = []; state.audit = []; state.db = mk([inv({})]); });

describe("carry over to next month", () => {
  it("creates a Draft for the next month with the same subjects and amounts, and nothing else of the old month", async () => {
    const res = await post({ invoiceId: "INV-1" });
    const { invoice } = await res.json();
    expect(res.status).toBe(200);
    expect(invoice).toMatchObject({ StudentID: "STU-1", Year: 2026, Month: 11, Status: "Draft", Amount: 11340, INRAmount: 11340, INRDue: 11340, Currency: "INR" });
    expect(invoice.InvoiceID).not.toBe("INV-1");
    expect(invoice.LineItems).toEqual([
      { ServiceID: "S1", BatchID: "B1", ScheduledHours: null, AttendedHours: null, Amount: 7560, Currency: "INR" },
      { ServiceID: "S2", BatchID: "B2", ScheduledHours: null, AttendedHours: null, Amount: 3780, Currency: "INR" },
    ]);
    for (const k of ["SentAt", "PaidAt", "StudentPaidFlag", "PaymentProofPath"]) expect(invoice[k]).toBeUndefined();
    expect(state.written).toEqual([["invoices"]]);
    expect((state.db as { invoices: unknown[] }).invoices.length).toBe(2);
    expect(state.audit.length).toBe(1);
  });
  it("the source invoice is left exactly as it was", async () => {
    await post({ invoiceId: "INV-1" });
    expect((state.db as { invoices: unknown[] }).invoices[0]).toEqual(inv({}));
  });
  it("December carries over to January of the next year", async () => {
    state.db = mk([inv({ Year: 2026, Month: 12 })]);
    const { invoice } = await (await post({ invoiceId: "INV-1" })).json();
    expect([invoice.Year, invoice.Month]).toEqual([2027, 1]);
  });
  it("keeps the discount, applied to the new subtotal", async () => {
    state.db = mk([inv({ DiscountPercent: 10 })]);
    const { invoice } = await (await post({ invoiceId: "INV-1" })).json();
    expect(invoice.DiscountPercent).toBe(10);
    expect(invoice.INRDue).toBe(10206); // 11340 less 10%
  });
  it("converts a foreign-currency invoice at the new month's rate", async () => {
    state.db = mk([inv({ Currency: "SAR", Amount: 500, INRAmount: 12500, INRDue: 12500, LineItems: [{ ServiceID: "S1", BatchID: "B1", Amount: 500, Currency: "SAR" }] })]);
    const { invoice } = await (await post({ invoiceId: "INV-1" })).json();
    expect(invoice).toMatchObject({ Currency: "SAR", Amount: 500, INRAmount: 12500 });
  });
  it("refuses when the student already has an invoice for the next month", async () => {
    state.db = mk([inv({}), inv({ InvoiceID: "INV-2", Month: 11 })]);
    const res = await post({ invoiceId: "INV-1" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("INV-2");
    expect(state.written).toEqual([]);
  });
  it("refuses a one-off invoice, an unknown invoice and a missing id", async () => {
    state.db = mk([{ InvoiceID: "INV-1", StudentID: "STU-1", ServiceID: "S1", Year: 2026, Month: 10, Amount: 500, Currency: "INR" }]);
    expect((await post({ invoiceId: "INV-1" })).status).toBe(400);
    expect((await post({ invoiceId: "INV-404" })).status).toBe(404);
    expect((await post({})).status).toBe(400);
    expect(state.written).toEqual([]);
  });
  it("leaves out a subject whose enrollment has ended and names it", async () => {
    state.db = mk([inv({})], enr([{}, { EndDate: "2026-10-31" }]));
    const res = await post({ invoiceId: "INV-1" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.invoice.LineItems.map((l: { ServiceID: string }) => l.ServiceID)).toEqual(["S1"]);
    expect(body.invoice).toMatchObject({ Amount: 7560, INRAmount: 7560, INRDue: 7560 });
    expect(body.skipped).toEqual(["Chemistry (enrollment ended 31/10/2026)"]);
  });
  it("leaves out a subject the student is no longer enrolled in at all", async () => {
    state.db = mk([inv({})], [enr()[0]!]);
    const body = await (await post({ invoiceId: "INV-1" })).json();
    expect(body.invoice.LineItems.length).toBe(1);
    expect(body.skipped).toEqual(["Chemistry (no enrollment)"]);
  });
  it("makes nothing when every subject has ended, and says why", async () => {
    state.db = mk([inv({})], enr([{ EndDate: "2026-10-31" }, { EndDate: "2026-09-30" }]));
    const res = await post({ invoiceId: "INV-1" });
    expect(res.status).toBe(400);
    const msg = (await res.json()).error;
    expect(msg).toContain("Biology (enrollment ended 31/10/2026)");
    expect(msg).toContain("Chemistry (enrollment ended 30/09/2026)");
    expect(state.written).toEqual([]);
  });
});

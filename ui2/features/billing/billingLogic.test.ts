import { describe, expect, it } from "vitest";
import { KINDS, buildAcknowledgedMessage, buildReminderMessage, duplicateMonths, fxRateTitle, groupBills, isSettled, laneOf, matchesStatus, needsApproval, paymentSectionFor, personSummary, totalDueLine } from "./billingLogic";
import type { BillRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";

const inv = KINDS.invoice;
const pay = KINDS.paycheck;
const base: BillRecord = { InvoiceID: "INV-1", StudentID: "STU-1", Year: 2026, Month: 10, Status: "Sent", Amount: 1000, INRAmount: 25000, INRDue: 25000, Currency: "SAR", StudentPaidFlag: false };
const mk = (o: Partial<BillRecord>): BillRecord => ({ ...base, ...o });

describe("lifecycle buckets (classic filter rules)", () => {
  const draft = mk({ Status: "Draft" });
  const unpaid = mk({ Status: "Sent" });
  const claimed = mk({ StudentPaidFlag: true, INRDue: 5000 });
  const settled = mk({ StudentPaidFlag: true, INRDue: 0 });
  it("draft", () => expect([draft, unpaid, claimed, settled].map((r) => matchesStatus(r, "draft", inv))).toEqual([true, false, false, false]));
  it("sent and unpaid", () => expect([draft, unpaid, claimed, settled].map((r) => matchesStatus(r, "sent-unpaid", inv))).toEqual([false, true, false, false]));
  it("needs approval means paid claimed and something still due", () => expect([draft, unpaid, claimed, settled].map((r) => needsApproval(r, inv))).toEqual([false, false, true, false]));
  it("settled means paid claimed and nothing due", () => expect([draft, unpaid, claimed, settled].map((r) => matchesStatus(r, "settled", inv))).toEqual([false, false, false, true]));
  it("all matches everything", () => expect([draft, unpaid, claimed, settled].every((r) => matchesStatus(r, "all", inv))).toBe(true));
  it("each bill is in exactly one lane", () => expect([draft, unpaid, claimed, settled].map((r) => laneOf(r, inv))).toEqual(["draft", "sent-unpaid", "needs-approval", "settled"]));
  it("paychecks use the received flag", () => expect(matchesStatus({ ...base, StaffReceivedFlag: true, INRDue: 0 }, "settled", pay)).toBe(true));
  it("summary counts per person", () => expect(personSummary([draft, unpaid, claimed, settled], inv)).toEqual({ draft: 1, needsApproval: 1, unpaid: 1 }));
  it("settled helper", () => expect(isSettled(settled, inv)).toBe(true));
});

describe("duplicates and fx", () => {
  it("counts a person-month with two bills once", () => {
    const d = duplicateMonths([mk({}), mk({}), mk({ Month: 9 })], inv);
    expect(d.groups).toBe(1);
    expect(d.keyOf(mk({}))).toBe("STU-1|2026|10");
  });
  it("fx title only for foreign currency", () => {
    expect(fxRateTitle(mk({ Currency: "INR" }))).toBeNull();
    expect(fxRateTitle(mk({}))).toBe("1 SAR ≈ 25.0000 INR, rate used for 10/2026");
  });
});

describe("grouping modes", () => {
  const rows = [mk({ InvoiceID: "a", StudentID: "S2", Month: 9 }), mk({ InvoiceID: "b", StudentID: "S1", Month: 10 }), mk({ InvoiceID: "c", StudentID: "S1", Month: 9, StudentPaidFlag: true, INRDue: 0 })];
  const nameOf = (id: string) => ({ S1: "Ann", S2: "Bob" })[id] ?? id;
  it("by person: names A to Z, newest period first inside", () => {
    const g = groupBills(rows, "person", inv, nameOf);
    expect(g.map((x) => x.label)).toEqual(["Ann", "Bob"]);
    expect(g[0]!.rows.map((r) => r.InvoiceID)).toEqual(["b", "c"]);
  });
  it("by month: newest first", () => expect(groupBills(rows, "month", inv, nameOf).map((x) => x.label)).toEqual(["Oct 2026", "Sep 2026"]));
  it("by due date: oldest first, overdue when unsettled and past", () => {
    const g = groupBills(rows, "due", inv, nameOf, new Date(2026, 9, 15));
    expect(g.map((x) => x.overdue)).toEqual([true, true]);
    expect(groupBills(rows.slice(2), "due", inv, nameOf, new Date(2026, 9, 15))[0]!.overdue).toBe(false);
  });
});

describe("messages", () => {
  const services: ServiceRecord[] = [{ ServiceID: "SVC-1", Name: "Cambridge IGCSE Physics", Type: "Course", Group: ["Student"], Board: "Cambridge", Course: "IGCSE", OptionalComponents: [{ ComponentID: "C", Batches: [{ BatchID: "B1", BatchName: "B14" }] }] }];
  const student: UserRecord = { UserID: "STU-1", UserType: "Student", Name: "Sam", Status: "Converted", Timezone: "Asia/Riyadh" };
  const row = mk({ LineItems: [{ ServiceID: "SVC-1", BatchID: "B1", Amount: 1000, Currency: "SAR" }], INRDue: 25000 });
  const noon = new Date("2026-10-02T06:00:00Z"); // 09:00 in Riyadh
  it("total due line shows INR in brackets for a foreign bill", () => expect(totalDueLine(row)).toBe("SAR 1000.00 (INR 25000.00)"));
  it("reminder text is exactly the classic layout", () => {
    expect(buildReminderMessage(row, student, services, "PAY HERE", "https://x.test", noon)).toBe(
      ["Good morning! Fee payment is requested. 😊", "", "DivergenCIE Student Details Export", "", "Student Name: Sam", "Status: Active", "Course: B14 Cambridge IGCSE", "Month(s): Oct 2026", "", "Total due: SAR 1000.00 (INR 25000.00)", "", "Official Invoice PDF: https://x.test/api/invoices/pdf?invoiceId=INV-1", "", "PAY HERE"].join("\n"),
    );
  });
  it("acknowledgement text is exactly the classic sentence", () => {
    const text = buildAcknowledgedMessage({ ...row, PaidAt: "2026-10-03T00:00:00Z" }, student, services);
    expect(text).toMatch(/^We acknowledge the fee payment receipt by Sam of SAR 1000\.00\/- for .+ in Oct 2026 on .+\. Updated in the system\. Thank you for choosing DivergenCIE Coaching! 💫$/);
  });
  it("payment section prefers the bill's currency", () => {
    expect(paymentSectionFor({ key: "k", label: "L", text: "default", byCurrency: { SAR: "sar text" } }, "SAR")).toBe("sar text");
    expect(paymentSectionFor({ key: "k", label: "L", text: "default" }, "GBP")).toBe("default");
  });
});

import { applyFilters, activeFilterCount, emptyFilters } from "./billingLogic";
describe("value and range filters", () => {
  const rows = [mk({ InvoiceID: "a", StudentID: "S1", Month: 8, INRDue: 100, Currency: "INR" }), mk({ InvoiceID: "b", StudentID: "S2", Month: 9, INRDue: 5000 }), mk({ InvoiceID: "c", StudentID: "S2", Month: 10, INRDue: 0, StudentPaidFlag: true })];
  const nameOf = (id: string) => ({ S1: "Ann Lee", S2: "Bob Ray" })[id] ?? id;
  const f = (o: object) => ({ ...emptyFilters(), ...o });
  const ids = (x: BillRecord[]) => x.map((r) => r.InvoiceID);
  it("no filters keeps all", () => expect(ids(applyFilters(rows, emptyFilters(), inv, nameOf))).toEqual(["a", "b", "c"]));
  it("search by name", () => expect(ids(applyFilters(rows, f({ search: "bob" }), inv, nameOf))).toEqual(["b", "c"]));
  it("period range is inclusive", () => expect(ids(applyFilters(rows, f({ from: "2026-09", to: "2026-09" }), inv, nameOf))).toEqual(["b"]));
  it("due range", () => expect(ids(applyFilters(rows, f({ dueMin: "50", dueMax: "1000" }), inv, nameOf))).toEqual(["a"]));
  it("currency", () => expect(ids(applyFilters(rows, f({ currency: "INR" }), inv, nameOf))).toEqual(["a"]));
  it("status combines with the rest", () => expect(ids(applyFilters(rows, f({ status: "settled", search: "bob" }), inv, nameOf))).toEqual(["c"]));
  it("counts active filters", () => expect(activeFilterCount(f({ search: "x", dueMin: "1" }))).toBe(2));
});

import { generateSummary, rebuildSummary } from "./billingLogic";
describe("monthly action summaries", () => {
  it("plain run", () => expect(generateSummary({ invoices: { created: [1, 2] }, paychecks: { created: [1] } }).text).toBe("Generated 2 invoices, 1 paycheck."));
  it("singular and zero", () => expect(generateSummary({ invoices: { created: [1] }, paychecks: { created: [] } }).text).toBe("Generated 1 invoice, 0 paychecks."));
  it("skipped items are warned about and listed", () => {
    const r = generateSummary({ invoices: { created: [], skipped: [{ studentId: "STU-1", serviceId: "SVC-1" }] }, paychecks: { created: [], skipped: [{ staffId: "TCH-1", serviceId: "SVC-2" }] } });
    expect(r.text).toBe("Generated 0 invoices, 0 paychecks. ⚠ Skipped 1 invoice(s) and 1 paycheck(s) that would have billed $0 (no scheduled hours), check the Batch's schedule or its billing type.");
    expect(r.skippedItems).toEqual(["STU-1/SVC-1", "TCH-1/SVC-2"]);
  });
  it("rebuild wording", () => {
    expect(rebuildSummary(3, 2, null, 0)).toBe("Rebuilt: 3 invoice line item(s) rebuilt for 2 student(s).");
    expect(rebuildSummary(3, 2, 1, 1)).toBe("Rebuilt: 3 invoice line item(s) rebuilt for 2 student(s), 1 paycheck line item(s) rebuilt for 1 staff.");
    expect(rebuildSummary(null, 0, null, 0)).toBe("Nothing selected to rebuild.");
  });
});

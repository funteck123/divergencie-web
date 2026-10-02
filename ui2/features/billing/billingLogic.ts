import { amountDueInOwnCurrency, greetingForTimezone, invoiceCourseSummary, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";
import { normalizeTimezone } from "@/lib/timezones";
import type { BillRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";

export type BillKind = "invoice" | "paycheck";

/** Everything that differs between an invoice and a paycheck, in one place. */
export interface KindConfig {
  kind: BillKind;
  idKey: "InvoiceID" | "PaycheckID";
  personKey: "StudentID" | "StaffID";
  /** The person's own "I paid" or "I received" self-report. */
  paidKey: "StudentPaidFlag" | "StaffReceivedFlag";
  paidAtKey: "PaidAt" | "ReceivedAt";
  endpoint: "/api/invoices" | "/api/paychecks";
  bodyIdKey: "invoiceId" | "paycheckId";
  responseKey: "invoice" | "paycheck";
  pdf: (id: string) => string;
  paidLabel: string;
  unpaidLabel: string;
  personHeader: string;
  noun: string;
  duplicateHint: string;
}

export const KINDS: Record<BillKind, KindConfig> = {
  invoice: {
    kind: "invoice", idKey: "InvoiceID", personKey: "StudentID", paidKey: "StudentPaidFlag", paidAtKey: "PaidAt", endpoint: "/api/invoices", bodyIdKey: "invoiceId", responseKey: "invoice",
    pdf: (id) => `/api/invoices/pdf?invoiceId=${id}`, paidLabel: "Paid", unpaidLabel: "Unpaid", personHeader: "Student", noun: "invoice",
    duplicateHint: "More than one invoice exists for this student in this month. If they bill the same subjects twice, delete the duplicate — otherwise (e.g. a separate OneOff purchase) this is expected.",
  },
  paycheck: {
    kind: "paycheck", idKey: "PaycheckID", personKey: "StaffID", paidKey: "StaffReceivedFlag", paidAtKey: "ReceivedAt", endpoint: "/api/paychecks", bodyIdKey: "paycheckId", responseKey: "paycheck",
    pdf: (id) => `/api/paychecks/pdf?paycheckId=${id}`, paidLabel: "Received", unpaidLabel: "Not received", personHeader: "Person", noun: "paycheck",
    duplicateHint: "More than one paycheck exists for this staff member in this month. If they cover the same subjects twice, delete the duplicate — otherwise (e.g. a separate OneOff payment) this is expected.",
  },
};

export type StatusFilter = "all" | "draft" | "sent-unpaid" | "needs-approval" | "settled";
export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: "All statuses", draft: "Draft", "sent-unpaid": "Sent, unpaid", "needs-approval": "Needs approval", settled: "Settled",
};

type Flags = Record<string, unknown>;

/** A person said they paid, but money is still due: the admin has to confirm the amount received. */
export const needsApproval = (r: BillRecord, k: KindConfig) => !!(r as Flags)[k.paidKey] && Number(r.INRDue) > 0;
/** Paid and nothing left due. */
export const isSettled = (r: BillRecord, k: KindConfig) => !!(r as Flags)[k.paidKey] && Number(r.INRDue) === 0;

/** Same lifecycle buckets as the classic filter: draft, sent and unpaid, needs approval, settled. */
export function matchesStatus(r: BillRecord, filter: StatusFilter, k: KindConfig): boolean {
  const flag = !!(r as Flags)[k.paidKey];
  const needs = needsApproval(r, k);
  switch (filter) {
    case "draft": return r.Status === "Draft";
    case "sent-unpaid": return r.Status === "Sent" && !flag;
    case "needs-approval": return needs;
    case "settled": return flag && !needs;
    default: return true;
  }
}

export function personSummary(rows: readonly BillRecord[], k: KindConfig) {
  return {
    draft: rows.filter((r) => r.Status === "Draft").length,
    needsApproval: rows.filter((r) => needsApproval(r, k)).length,
    unpaid: rows.filter((r) => r.Status === "Sent" && !(r as Flags)[k.paidKey]).length,
  };
}

/** Rows that share a person and a month: usually a duplicate bill, so they are flagged. */
export function duplicateMonths(rows: readonly BillRecord[], k: KindConfig) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = `${(r as Flags)[k.personKey]}|${r.Year}|${r.Month}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return { counts, groups: [...counts.values()].filter((n) => n > 1).length, keyOf: (r: BillRecord) => `${(r as Flags)[k.personKey]}|${r.Year}|${r.Month}` };
}

/** "1 USD ≈ 83.1234 INR, rate used for 10/2026", or null for INR bills. */
export function fxRateTitle(r: BillRecord): string | null {
  const currency = r.Currency || "INR";
  const amount = Number(r.Amount);
  if (currency === "INR" || !amount) return null;
  return `1 ${currency} ≈ ${(Number(r.INRAmount) / amount).toFixed(4)} INR, rate used for ${r.Month}/${r.Year}`;
}

export const periodKey = (r: BillRecord) => r.Year * 100 + r.Month;
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const periodLabel = (r: BillRecord) => `${MONTH_NAMES[r.Month - 1]} ${r.Year}`;

/** The invoice PDF calls the first day of the billing month its due date. */
export const dueDateOf = (r: BillRecord) => new Date(r.Year, r.Month - 1, 1);

export type Mode = "table" | "person" | "month" | "due" | "lanes";
export const MODE_LABEL: Record<Mode, string> = { table: "Table", person: "By person", month: "By month", due: "By due date", lanes: "By status" };

export interface Group {
  key: string;
  label: string;
  rows: BillRecord[];
  /** For the due-date mode: some bill in the group is unsettled and its due date is in the past. */
  overdue?: boolean;
}

export const LANES: { id: StatusFilter; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "sent-unpaid", label: "Sent, unpaid" },
  { id: "needs-approval", label: "Needs approval" },
  { id: "settled", label: "Settled" },
];

/** A bill sits in exactly one lane. Order matters: needs approval beats settled beats sent beats draft. */
export function laneOf(r: BillRecord, k: KindConfig): StatusFilter {
  if (needsApproval(r, k)) return "needs-approval";
  if ((r as Flags)[k.paidKey]) return "settled";
  if (r.Status === "Sent") return "sent-unpaid";
  return "draft";
}

export function groupBills(rows: readonly BillRecord[], mode: Mode, k: KindConfig, nameOf: (id: string) => string, now = new Date()): Group[] {
  const bucket = (keyFn: (r: BillRecord) => string, labelFn: (key: string, rows: BillRecord[]) => string) => {
    const m = new Map<string, BillRecord[]>();
    for (const r of rows) m.set(keyFn(r), [...(m.get(keyFn(r)) ?? []), r]);
    return [...m.entries()].map(([key, list]) => ({ key, label: labelFn(key, list), rows: list }));
  };
  if (mode === "person")
    return bucket((r) => String((r as Flags)[k.personKey]), (key) => nameOf(key))
      .map((g) => ({ ...g, rows: [...g.rows].sort((a, b) => periodKey(b) - periodKey(a)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  if (mode === "month")
    return bucket((r) => String(periodKey(r)), (_k, list) => periodLabel(list[0] as BillRecord)).sort((a, b) => Number(b.key) - Number(a.key));
  if (mode === "due") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return bucket((r) => String(periodKey(r)), (_k, list) => `Due ${formatDate((dueDateOf(list[0] as BillRecord)).toISOString().slice(0, 10))}`)
      .map((g) => ({ ...g, overdue: dueDateOf(g.rows[0] as BillRecord) < startOfToday && g.rows.some((r) => !isSettled(r, k)) }))
      .sort((a, b) => Number(a.key) - Number(b.key));
  }
  return [{ key: "all", label: "", rows: [...rows] }];
}

// ---- messages (kept character for character: staff paste these into WhatsApp) -----------------

export function invoiceCourseLine(r: BillRecord, services: readonly ServiceRecord[]): string {
  if (Array.isArray(r.LineItems)) {
    return r.LineItems.map((li) => {
      const s = services.find((x) => x.ServiceID === li.ServiceID);
      return s ? (lineItemName(s, li.BatchID) as string) : li.ServiceID;
    }).join(", ");
  }
  const s = services.find((x) => x.ServiceID === r.ServiceID);
  return s ? (lineItemName(s, r.BatchID) as string) : String(r.ServiceID);
}

export function totalDueLine(r: BillRecord): string {
  const currency = r.Currency || "INR";
  const due = amountDueInOwnCurrency(r, currency) as number;
  if (currency === "INR") return `${currency} ${due.toFixed(2)}`;
  return `${currency} ${due.toFixed(2)} (INR ${Number(r.INRDue).toFixed(2)})`;
}

export function buildReminderMessage(r: BillRecord, student: UserRecord | undefined, services: readonly ServiceRecord[], paymentSection: string, origin: string, now: Date = new Date()): string {
  const pdfUrl = `${origin}/api/invoices/pdf?invoiceId=${r.InvoiceID}`;
  return [
    `${greetingForTimezone(normalizeTimezone(student?.Timezone), now)}! Fee payment is requested. 😊`,
    "",
    "DivergenCIE Student Details Export",
    "",
    `Student Name: ${student?.Name || r.StudentID}`,
    `Status: ${student?.Status === "Converted" ? "Active" : student?.Status || "Active"}`,
    `Course: ${invoiceCourseSummary(r, services)}`,
    `Month(s): ${MONTH_NAMES[r.Month - 1]} ${r.Year}`,
    "",
    `Total due: ${totalDueLine(r)}`,
    "",
    `Official Invoice PDF: ${pdfUrl}`,
    "",
    paymentSection,
  ].join("\n");
}

export function buildAcknowledgedMessage(r: BillRecord, student: UserRecord | undefined, services: readonly ServiceRecord[], now = new Date()): string {
  const currency = r.Currency || "INR";
  const paidDate = r.PaidAt ? formatDate(r.PaidAt) : formatDate(now.toISOString());
  return `We acknowledge the fee payment receipt by ${student?.Name || r.StudentID} of ${currency} ${Number(r.Amount).toFixed(2)}/- for ${invoiceCourseLine(r, services)} in ${MONTH_NAMES[r.Month - 1]} ${r.Year} on ${paidDate}. Updated in the system. Thank you for choosing DivergenCIE Coaching! 💫`;
}

export interface PaymentOption {
  key: string;
  label: string;
  text?: string;
  byCurrency?: Record<string, string>;
}
/** The payment section for the bill's currency when the option has one, else the option's own text. */
export const paymentSectionFor = (opt: PaymentOption, currency: string | undefined) => opt.byCurrency?.[currency || "INR"] || opt.text || "";

// ---- filters: by value and by range ------------------------------------------------------------

export interface BillFilters {
  search: string;
  status: StatusFilter;
  /** "YYYY-MM", inclusive. Empty means no limit. */
  from: string;
  to: string;
  /** INR still due, inclusive. Empty means no limit. */
  dueMin: string;
  dueMax: string;
  /** Bill currency; empty means any. */
  currency: string;
}
export const emptyFilters = (): BillFilters => ({ search: "", status: "all", from: "", to: "", dueMin: "", dueMax: "", currency: "" });

export const activeFilterCount = (f: BillFilters) => [f.search.trim(), f.status !== "all", f.from, f.to, f.dueMin, f.dueMax, f.currency].filter(Boolean).length;

const monthNumber = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return Number.isFinite(y) && Number.isFinite(m) ? (y as number) * 100 + (m as number) : null;
};

export function applyFilters(rows: readonly BillRecord[], f: BillFilters, k: KindConfig, nameOf: (id: string) => string): BillRecord[] {
  const needle = f.search.trim().toLowerCase();
  const from = f.from ? monthNumber(f.from) : null;
  const to = f.to ? monthNumber(f.to) : null;
  const min = f.dueMin === "" ? null : Number(f.dueMin);
  const max = f.dueMax === "" ? null : Number(f.dueMax);
  return rows.filter((r) => {
    if (!matchesStatus(r, f.status, k)) return false;
    if (needle && !nameOf(String((r as Record<string, unknown>)[k.personKey])).toLowerCase().includes(needle)) return false;
    if (from !== null && periodKey(r) < from) return false;
    if (to !== null && periodKey(r) > to) return false;
    if (min !== null && Number(r.INRDue) < min) return false;
    if (max !== null && Number(r.INRDue) > max) return false;
    if (f.currency && (r.Currency || "INR") !== f.currency) return false;
    return true;
  });
}

// ---- summaries of the monthly actions (wording kept as in classic) ---------------------------------

interface Skipped {
  studentId?: string;
  staffId?: string;
  serviceId?: string;
}
export interface GenerateLike {
  invoices: { created?: unknown[]; skipped?: Skipped[] };
  paychecks: { created?: unknown[]; skipped?: Skipped[] };
}

export function generateSummary({ invoices, paychecks }: GenerateLike): { text: string; skippedItems: string[] } {
  const ci = invoices.created?.length || 0;
  const cp = paychecks.created?.length || 0;
  let text = `Generated ${ci} invoice${invoices.created?.length === 1 ? "" : "s"}, ${cp} paycheck${paychecks.created?.length === 1 ? "" : "s"}.`;
  const skippedItems = [...(invoices.skipped || []), ...(paychecks.skipped || [])].map((s) => `${s.studentId || s.staffId}/${s.serviceId}`);
  const si = invoices.skipped?.length || 0;
  const sp = paychecks.skipped?.length || 0;
  if (si + sp) text += ` ⚠ Skipped ${si} invoice(s) and ${sp} paycheck(s) that would have billed $0 (no scheduled hours), check the Batch's schedule or its billing type.`;
  return { text, skippedItems };
}

export function rebuildSummary(invoiceCreated: number | null, studentCount: number, paycheckCreated: number | null, staffCount: number): string {
  const parts: string[] = [];
  if (invoiceCreated !== null) parts.push(`${invoiceCreated} invoice line item(s) rebuilt for ${studentCount} student(s)`);
  if (paycheckCreated !== null) parts.push(`${paycheckCreated} paycheck line item(s) rebuilt for ${staffCount} staff`);
  return parts.length > 0 ? `Rebuilt: ${parts.join(", ")}.` : "Nothing selected to rebuild.";
}

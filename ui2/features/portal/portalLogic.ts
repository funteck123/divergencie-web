import { batchesOf, lineItemName, rateById } from "@/lib/billing";
import { daysAgoStr, todayDateStr } from "@/lib/client";
import type { AttendanceItem, BillRecord, EnrollmentRecord, ScheduleItem, ServiceRecord } from "@/ui2/queries/types";

export interface MyOccurrence {
  Day?: string;
  Time?: string;
  Duration: number | string;
  Facilitator?: string;
}

/** A service the person is enrolled in, with the one rate, batch and occurrences that apply to them. */
export interface EnrolledService extends ServiceRecord {
  _myRate: { Currency: string; Rate: number | string; Description?: string } | undefined;
  _myOccurrences: MyOccurrence[];
}

export function enrolledServices(enrollments: readonly EnrollmentRecord[] = [], services: readonly ServiceRecord[] = []): EnrolledService[] {
  const out: EnrolledService[] = [];
  for (const e of enrollments) {
    const s = services.find((x) => x.ServiceID === e.ServiceID);
    if (!s) continue;
    const batches = batchesOf(s) as { BatchID: string; OccuranceList?: MyOccurrence[] }[];
    const myBatch = e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0];
    const mine = batches.length > 0 ? myBatch?.OccuranceList ?? [] : ((s.OccuranceList as unknown as MyOccurrence[] | undefined) ?? []);
    out.push({ ...s, _myRate: rateById(s, e.BatchID, e.RateID), _myOccurrences: mine });
  }
  return out;
}

export function occurrencesText(s: EnrolledService): string {
  const scheduled = s._myOccurrences.filter((o) => o.Day && o.Time);
  return scheduled.length ? scheduled.map((o) => `${o.Day} ${o.Time} (${o.Duration}h)${o.Facilitator ? ` · ${o.Facilitator}` : ""}`).join(", ") : "Not scheduled yet";
}

export type Range = "upcoming" | "last7" | "last30" | "all";

/** The session list's date range. "upcoming" is today onward, "last N" looks back and stops at today. */
export function inRange(s: Pick<ScheduleItem, "Date">, range: Range, today = todayDateStr() as string, ago = (n: number) => daysAgoStr(n) as string): boolean {
  if (range === "all") return true;
  if (range === "last7") return s.Date >= ago(7) && s.Date <= today;
  if (range === "last30") return s.Date >= ago(30) && s.Date <= today;
  return s.Date >= today;
}

/** The attendance record to show for a session: the viewer's own when they logged one, else the first. */
export function myAttendance(attendance: readonly AttendanceItem[], scheduleId: string, viewerId: string): AttendanceItem | undefined {
  const records = attendance.filter((a) => a.ScheduleItemID === scheduleId);
  return records.find((a) => a.LoggedBy === viewerId) ?? records[0];
}

/** Bills the person can see: a draft is the admin's work in progress and is never shown. */
export const visibleBills = (bills: readonly BillRecord[] = []) => bills.filter((b) => b.Status !== "Draft");

export const billPeriod = (b: BillRecord) => b.Year * 100 + b.Month;

export function billServiceNames(b: BillRecord, services: readonly ServiceRecord[]): string[] {
  const name = (id?: string, batchId?: string) => {
    const s = services.find((x) => x.ServiceID === id);
    return s ? (lineItemName(s, batchId) as string) : "—";
  };
  return Array.isArray(b.LineItems) ? b.LineItems.map((li) => name(li.ServiceID, li.BatchID)) : [name(b.ServiceID, b.BatchID)];
}

export const attendedHours = (b: BillRecord) => (Array.isArray(b.LineItems) ? b.LineItems.reduce((sum, li) => sum + (Number(li.AttendedHours) || 0), 0) : Number((b as Record<string, unknown>).AttendedHours) || 0);

/** Stripe checkout link for one invoice (the gateway URL is set per deployment; no link when it is not). */
export function stripeLink(gateway: string | undefined, invoiceId: string, email?: string): string | null {
  if (!gateway) return null;
  const url = new URL(gateway);
  url.searchParams.set("client_reference_id", invoiceId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export { DAY_ORDER };

/** Recurring weekly slots grouped by weekday, earliest first, plus how many enrollments have no schedule yet. */
export function weekly(services: readonly EnrolledService[]) {
  const byDay = new Map<string, (MyOccurrence & { serviceLabel: string })[]>();
  let unscheduled = 0;
  for (const s of services) {
    const label = s.Code ? `${s.Code as string} · ${s.Name}` : s.Name;
    for (const o of s._myOccurrences) {
      if (!o.Day || !o.Time) {
        unscheduled++;
        continue;
      }
      byDay.set(o.Day, [...(byDay.get(o.Day) ?? []), { ...o, serviceLabel: label }]);
    }
  }
  for (const list of byDay.values()) list.sort((a, b) => (a.Time as string).localeCompare(b.Time as string));
  return { byDay, unscheduled, hasAny: DAY_ORDER.some((d) => (byDay.get(d) ?? []).length > 0) };
}

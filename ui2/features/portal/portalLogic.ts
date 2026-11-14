import { amountDueInOwnCurrency, batchesOf, lineItemName, rateById } from "@/lib/billing";
import { daysAgoStr, todayDateStr } from "@/lib/client";
import { convertScheduleDateTime, normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
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
  /** The batch the person is enrolled in, when it has a name (TKT-0330). */
  _myBatch: string;
  /** One per enrollment: a person can hold several batches of the same service. */
  _key: string;
}

/** Anything that is not a list (null, an error object) counts as empty: a reply without a list must not crash the page. */
const asList = <T,>(v: unknown): readonly T[] => (Array.isArray(v) ? (v as T[]) : []);

export function enrolledServices(enrollmentsIn?: readonly EnrollmentRecord[] | null, servicesIn?: readonly ServiceRecord[] | null): EnrolledService[] {
  const enrollments = asList<EnrollmentRecord>(enrollmentsIn);
  const services = asList<ServiceRecord>(servicesIn);
  const out: EnrolledService[] = [];
  for (const e of enrollments) {
    const s = services.find((x) => x.ServiceID === e.ServiceID);
    if (!s) continue;
    const batches = batchesOf(s) as { BatchID: string; BatchName?: string; OccuranceList?: MyOccurrence[] }[];
    const myBatch = e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0];
    const mine = batches.length > 0 ? myBatch?.OccuranceList ?? [] : ((s.OccuranceList as unknown as MyOccurrence[] | undefined) ?? []);
    out.push({ ...s, _myRate: rateById(s, e.BatchID, e.RateID), _myOccurrences: mine, _myBatch: myBatch?.BatchName?.trim() ?? "", _key: e.EnrolmentID || `${e.ServiceID}:${e.BatchID ?? ""}` });
  }
  return out;
}

export function occurrencesText(s: EnrolledService): string {
  const scheduled = s._myOccurrences.filter((o) => o.Day && o.Time);
  return scheduled.length ? scheduled.map((o) => `${o.Day} ${o.Time} (${o.Duration}h)${o.Facilitator ? ` · ${o.Facilitator}` : ""}`).join(", ") : "Not scheduled yet";
}

export interface SessionGroup {
  /** The teacher for these sessions, or "" when none is set. */
  facilitator: string;
  sessions: { when: string; hours: string }[];
}

/**
 * The weekly sessions of a service grouped by teacher, in the order given, so a teacher's name appears once instead of after every
 * session (TKT-0359). A session needs a day and a time; one without either is left out, like in occurrencesText.
 */
export function sessionGroups(s: Pick<EnrolledService, "_myOccurrences">): SessionGroup[] {
  const groups: SessionGroup[] = [];
  for (const o of s._myOccurrences) {
    if (!o.Day || !o.Time) continue;
    const who = (o.Facilitator ?? "").trim();
    const group = groups.find((g) => g.facilitator === who) ?? (groups.push({ facilitator: who, sessions: [] }), groups[groups.length - 1] as SessionGroup);
    group.sessions.push({ when: `${o.Day} ${o.Time}`, hours: `${o.Duration}h` });
  }
  return groups;
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
export const visibleBills = (bills?: readonly BillRecord[] | null) => asList<BillRecord>(bills).filter((b) => b.Status !== "Draft");

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
    const label = `${s.Code ? `${s.Code as string} · ${s.Name}` : s.Name}${s._myBatch ? ` (${s._myBatch})` : ""}`;
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

/**
 * Does a person's own resource button (Timesheet, Progress Tracker) show on their portal? Management can switch each one off for everyone
 * (the global resource toggles). The Timesheet is the exception: anyone who has their own timesheet link (a student, a teacher) always gets
 * the button, because a link that exists but cannot be reached from the portal is the bug (TKT-0371).
 */
export function showUserFeature(feature: { slug: string; toggleKey: string; linkField: string }, toggles: Record<string, boolean>, user: Record<string, unknown>): boolean {
  if (toggles[feature.toggleKey]) return true;
  const link = user[feature.linkField];
  return feature.slug === "timesheet" && typeof link === "string" && link.trim() !== "";
}

// ---- "At a glance" for a parent (TKT-0421): the two things a parent opens the page for ------------------------------------------------------

export interface NextSession {
  /** Start of the class as a UTC time stamp (ms), used for ordering. */
  when: number;
  date: string;
  time: string;
  /** Short label of the class's own time zone, e.g. "IST". */
  tz: string;
  serviceName: string;
  facilitator: string;
}

/**
 * The soonest class that has not ended yet, from a child's schedule. A rescheduled class counts at its new date and time. Times are read in the
 * class's own time zone and compared as real moments, so a class at 17:00 IST is not "tomorrow" because the viewer is somewhere else. A cancelled
 * class and one without a date or a time are skipped. Anything that is not a list gives null.
 */
export function nextSession(items: readonly ScheduleItem[] | null | undefined, nowMs: number): NextSession | null {
  let best: NextSession | null = null;
  for (const it of asList<ScheduleItem>(items)) {
    const date = String(it.RescheduledDate || it.Date || "");
    const time = String(it.RescheduledTime || it.Time || "");
    if (!date || !time || String(it.Status ?? "").toLowerCase() === "cancelled") continue;
    const tz = normalizeTimezone(it.Timezone) as string;
    const utc = convertScheduleDateTime(date, time, tz, "UTC") as { date: string; time: string };
    const when = Date.parse(`${utc.date}T${utc.time}:00Z`);
    if (!Number.isFinite(when)) continue;
    const hours = Number(it.Duration) > 0 ? Number(it.Duration) : 1;
    if (when + hours * 3600000 < nowMs) continue; // already over
    if (!best || when < best.when) best = { when, date, time, tz: tzAbbrFor(date, tz) as string, serviceName: String(it.ServiceName ?? ""), facilitator: String(it.Facilitator ?? "").trim() };
  }
  return best;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Mon 16 Nov, 17:00 IST" */
export function nextSessionText(n: Pick<NextSession, "date" | "time" | "tz">): string {
  const [y, m, d] = n.date.split("-").map(Number) as [number, number, number];
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${d} ${MONTHS[m - 1]}, ${n.time}${n.tz ? ` ${n.tz}` : ""}`;
}

export interface Owed {
  currency: string;
  amount: number;
  count: number;
}

/**
 * What is still to pay: sent invoices that nobody has marked paid, added up per currency, in the invoice's own currency (the same figure the
 * invoice table shows as "Amount Due"). Drafts and invoices already marked paid are left out. Anything that is not a list gives [].
 */
export function amountsOwed(bills: readonly BillRecord[] | null | undefined): Owed[] {
  const out: Owed[] = [];
  for (const b of asList<BillRecord>(bills)) {
    if (b.Status !== "Sent" || (b as { StudentPaidFlag?: unknown }).StudentPaidFlag) continue;
    const amount = amountDueInOwnCurrency(b) as number;
    if (!(amount > 0)) continue;
    const currency = b.Currency || "INR";
    const row = out.find((o) => o.currency === currency);
    if (row) { row.amount = Math.round((row.amount + amount) * 100) / 100; row.count += 1; } else out.push({ currency, amount, count: 1 });
  }
  return out;
}

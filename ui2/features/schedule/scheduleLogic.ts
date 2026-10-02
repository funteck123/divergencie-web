import { todayDateStr } from "@/lib/client";
import type { AttendanceItem, EnrollmentRecord, ScheduleItem } from "@/ui2/queries/types";

/** Two records for one person in one session that disagree on status or hours. Resolving one is the admin's job. */
export function hasConflict(records: readonly AttendanceItem[]): boolean {
  return records.length > 1 && records.some((a, i) => records.some((b, j) => i !== j && (a.Status !== b.Status || Number(a.LoggedDuration) !== Number(b.LoggedDuration))));
}

/** Ids of sessions with at least one conflicting person (same rule as the classic Schedule tab). */
export function conflictingScheduleIds(attendance: readonly AttendanceItem[]): Set<string> {
  const bySessionPerson = new Map<string, AttendanceItem[]>();
  for (const a of attendance) {
    const key = `${a.ScheduleItemID}::${a.UserID}`;
    bySessionPerson.set(key, [...(bySessionPerson.get(key) ?? []), a]);
  }
  const ids = new Set<string>();
  for (const records of bySessionPerson.values()) if (hasConflict(records)) ids.add((records[0] as AttendanceItem).ScheduleItemID);
  return ids;
}

/** Auto-generated sessions of services that someone is enrolled in (the "Service Schedule" list). */
export function serviceSlots(items: readonly ScheduleItem[], enrollments: readonly EnrollmentRecord[]): ScheduleItem[] {
  const enrolled = new Set(enrollments.map((e) => e.ServiceID));
  return items.filter((i) => i.OccuranceID !== null && i.OccuranceID !== undefined && enrolled.has(i.ServiceID as string));
}

export const openPoolSlots = (data: { scheduleItems: readonly ScheduleItem[]; openPoolSlotIds: readonly string[] }) => {
  const ids = new Set(data.openPoolSlotIds);
  return data.scheduleItems.filter((s) => ids.has(s.ScheduleID));
};

export function dropPast(items: readonly ScheduleItem[], showPast: boolean, today = todayDateStr() as string): ScheduleItem[] {
  return showPast ? [...items] : items.filter((s) => s.Date >= today);
}

export function matchesSearch(s: ScheduleItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  return !needle || (s.ServiceName || "").toLowerCase().includes(needle) || (s.Facilitator || "").toLowerCase().includes(needle);
}

/** The attendance record that counts for a session: an accepted one when there is one, else the first. */
export function attendanceFor(attendance: readonly AttendanceItem[], scheduleId: string): AttendanceItem | undefined {
  const records = attendance.filter((a) => a.ScheduleItemID === scheduleId);
  return records.find((a) => a.AcceptedForBilling !== false) ?? records[0];
}

/** "#3": which occurrence of its recurring slot a session is, counted by date. */
export function occurrenceNumbers(items: readonly ScheduleItem[]): Map<string, number> {
  const byOcc = new Map<string, ScheduleItem[]>();
  for (const s of items) if (s.OccuranceID) byOcc.set(s.OccuranceID, [...(byOcc.get(s.OccuranceID) ?? []), s]);
  const out = new Map<string, number>();
  for (const list of byOcc.values())
    [...list].sort((a, b) => (a.Date + a.Time).localeCompare(b.Date + b.Time)).forEach((s, i) => out.set(s.ScheduleID, i + 1));
  return out;
}

/** Sessions grouped by date, dates ascending, times ascending inside a day. The agenda view. */
export function agenda(items: readonly ScheduleItem[]): { date: string; items: ScheduleItem[] }[] {
  const byDate = new Map<string, ScheduleItem[]>();
  for (const s of items) byDate.set(s.Date, [...(byDate.get(s.Date) ?? []), s]);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, items: [...list].sort((a, b) => a.Time.localeCompare(b.Time)) }));
}

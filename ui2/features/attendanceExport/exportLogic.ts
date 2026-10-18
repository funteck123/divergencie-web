import type { AttendanceItem, EnrollmentRecord, ScheduleItem } from "@/ui2/queries/types";

/** TKT-0354: everything one account has in attendance, grouped by month, ready for a spreadsheet. Pure functions, no network. */
export interface ExportRow {
  month: string; // "2026-10"
  date: string;
  time: string;
  service: string;
  status: string; // Present, Late, Absent, ... or "Not logged"
  hours: number;
  loggedBy: string;
  acceptedForBilling: string; // "Yes" | "No" | ""
  topic: string;
  note: string;
}

export interface MonthSummary {
  month: string;
  sessions: number;
  present: number;
  late: number;
  absent: number;
  notLogged: number;
  hours: number;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The same rule the server uses to decide who is in a session: a slot with no batch matches any enrollment of that service. */
function enrolledIn(slot: ScheduleItem, enrollments: readonly EnrollmentRecord[]): boolean {
  const batch = (slot as { BatchID?: string }).BatchID;
  return enrollments.some((e) => e.ServiceID === slot.ServiceID && (!batch || batch === e.BatchID) && (!e.StartDate || slot.Date >= e.StartDate) && (!e.EndDate || slot.Date <= e.EndDate));
}

/**
 * One row per attendance record of the account, plus one "Not logged" row for each past session of a service the account is
 * enrolled in that has no record at all. Sorted by date and time. Sessions in the future are left out.
 */
export function buildExportRows(input: { userId: string; attendance: readonly AttendanceItem[]; schedule: readonly ScheduleItem[]; enrollments: readonly EnrollmentRecord[]; today: string }): ExportRow[] {
  const { userId, attendance, schedule, enrollments, today } = input;
  const slotById = new Map(schedule.map((s) => [s.ScheduleID, s]));
  const mine = attendance.filter((a) => a.UserID === userId);
  const rows: ExportRow[] = [];
  const logged = new Set<string>();
  for (const a of mine) {
    logged.add(a.ScheduleItemID);
    const slot = slotById.get(a.ScheduleItemID);
    const date = slot?.RescheduledDate || slot?.Date || a.Date || "";
    rows.push({
      month: date.slice(0, 7),
      date,
      time: slot?.RescheduledTime || slot?.Time || "",
      service: slot?.ServiceName ?? "",
      status: a.Status,
      hours: toNum(a.LoggedDuration),
      loggedBy: a.LoggedBy ?? "",
      acceptedForBilling: a.AcceptedForBilling === undefined ? "" : a.AcceptedForBilling ? "Yes" : "No",
      topic: a.TopicName ?? "",
      note: slot ? "" : "Session no longer in the schedule",
    });
  }
  const mineEnrollments = enrollments.filter((e) => e.UserID === userId);
  for (const slot of schedule) {
    if (logged.has(slot.ScheduleID) || !slot.ServiceID) continue;
    const date = slot.RescheduledDate || slot.Date;
    if (!date || date > today || !enrolledIn(slot, mineEnrollments)) continue;
    rows.push({ month: date.slice(0, 7), date, time: slot.RescheduledTime || slot.Time, service: slot.ServiceName ?? "", status: "Not logged", hours: 0, loggedBy: "", acceptedForBilling: "", topic: "", note: "" });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.service.localeCompare(b.service));
}

/** Keep the months from `from` to `to` (both "YYYY-MM", either may be empty for no limit). */
export function filterMonths(rows: readonly ExportRow[], from: string, to: string): ExportRow[] {
  return rows.filter((r) => (!from || r.month >= from) && (!to || r.month <= to));
}

export function summarizeMonths(rows: readonly ExportRow[]): MonthSummary[] {
  const by = new Map<string, MonthSummary>();
  for (const r of rows) {
    const m = by.get(r.month) ?? { month: r.month, sessions: 0, present: 0, late: 0, absent: 0, notLogged: 0, hours: 0 };
    m.sessions++;
    if (r.status === "Present") m.present++;
    else if (r.status === "Late") m.late++;
    else if (r.status === "Absent") m.absent++;
    else if (r.status === "Not logged") m.notLogged++;
    m.hours = round2(m.hours + r.hours);
    by.set(r.month, m);
  }
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month || "No date";
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** A cell that starts with = + - or @ would run as a formula when the file is opened in Excel, so it gets a leading apostrophe. */
export function safeCell(value: string | number): string {
  const s = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(header: readonly string[], lines: readonly (readonly (string | number)[])[]): string {
  // The byte order mark makes Excel read the file as UTF-8 (names and topics may carry accents).
  return "﻿" + [header, ...lines].map((l) => l.map(safeCell).join(",")).join("\r\n") + "\r\n";
}

export const SESSION_HEADER = ["Month", "Date", "Time", "Service", "Status", "Hours logged", "Logged by", "Accepted for billing", "Topic", "Note"] as const;
export const sessionLines = (rows: readonly ExportRow[]) => rows.map((r) => [monthLabel(r.month), r.date, r.time, r.service, r.status, r.hours, r.loggedBy, r.acceptedForBilling, r.topic, r.note]);
export const SUMMARY_HEADER = ["Month", "Sessions", "Present", "Late", "Absent", "Not logged", "Hours logged"] as const;
export const summaryLines = (months: readonly MonthSummary[]) => months.map((m) => [monthLabel(m.month), m.sessions, m.present, m.late, m.absent, m.notLogged, m.hours]);

export function exportFilename(name: string, kind: "sessions" | "monthly", from: string, to: string): string {
  const who = name.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "") || "account";
  const span = from || to ? `_${from || "start"}_to_${to || "now"}` : "";
  return `DC_Attendance_${who}_${kind}${span}.csv`;
}

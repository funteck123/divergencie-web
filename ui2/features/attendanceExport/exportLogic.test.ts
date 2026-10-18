import { describe, expect, it } from "vitest";
import { buildExportRows, exportFilename, filterMonths, monthLabel, safeCell, summarizeMonths, toCsv } from "./exportLogic";
import type { AttendanceItem, EnrollmentRecord, ScheduleItem } from "@/ui2/queries/types";

const slot = (id: string, date: string, extra: Partial<ScheduleItem> = {}): ScheduleItem => ({ ScheduleID: id, ServiceID: "S1", ServiceName: "Physics", Date: date, Time: "17:00", Duration: 1, ...extra });
const att = (id: string, sched: string, status: string, hrs: number | string, extra: Partial<AttendanceItem> = {}): AttendanceItem => ({ AttendanceID: id, ScheduleItemID: sched, UserID: "STU-1", Status: status, LoggedDuration: hrs, LoggedBy: "STU-1", ...extra });
const enr: EnrollmentRecord[] = [{ EnrolmentID: "E1", UserID: "STU-1", ServiceID: "S1", BatchID: "B1", StartDate: "2026-09-01", EndDate: "" }];
const TODAY = "2026-10-14";

describe("buildExportRows", () => {
  const schedule = [slot("a", "2026-09-10"), slot("b", "2026-09-17"), slot("c", "2026-10-01"), slot("d", "2026-10-20"), slot("e", "2026-08-01"), slot("f", "2026-10-02", { ServiceID: "S2" })];
  const attendance = [att("1", "a", "Present", 1.5), att("2", "b", "Absent", 0), att("3", "c", "Late", "1", { AcceptedForBilling: true, TopicName: "Waves" }), { ...att("4", "a", "Present", 1), UserID: "OTHER" }];
  const rows = buildExportRows({ userId: "STU-1", attendance, schedule, enrollments: enr, today: TODAY });
  it("has one row per own record, no one else's", () => {
    expect(rows.filter((r) => r.status !== "Not logged").map((r) => r.date)).toEqual(["2026-09-10", "2026-09-17", "2026-10-01"]);
  });
  it("adds past enrolled sessions with no record as Not logged, and leaves out the future, other services and sessions before enrolment", () => {
    expect(rows.filter((r) => r.status === "Not logged")).toEqual([]); // d is future, e is before StartDate, f is another service
    const more = buildExportRows({ userId: "STU-1", attendance: [att("1", "a", "Present", 1)], schedule, enrollments: enr, today: TODAY });
    expect(more.filter((r) => r.status === "Not logged").map((r) => r.date)).toEqual(["2026-09-17", "2026-10-01"]);
  });
  it("reads hours as numbers, billing as Yes/No, and keeps the topic", () => {
    const c = rows.find((r) => r.date === "2026-10-01")!;
    expect(c).toMatchObject({ hours: 1, acceptedForBilling: "Yes", topic: "Waves", month: "2026-10", service: "Physics" });
  });
  it("uses the rescheduled date when the session moved", () => {
    const r = buildExportRows({ userId: "STU-1", attendance: [att("1", "a", "Present", 1)], schedule: [slot("a", "2026-09-10", { RescheduledDate: "2026-09-12", RescheduledTime: "18:30" })], enrollments: enr, today: TODAY });
    expect([r[0]!.date, r[0]!.time, r[0]!.month]).toEqual(["2026-09-12", "18:30", "2026-09"]);
  });
  it("keeps a record whose session is gone from the schedule, with a note", () => {
    const r = buildExportRows({ userId: "STU-1", attendance: [att("1", "gone", "Present", 1, { Date: "2026-09-05" })], schedule: [], enrollments: [], today: TODAY });
    expect(r[0]).toMatchObject({ date: "2026-09-05", service: "", note: "Session no longer in the schedule" });
  });
});

describe("months", () => {
  const rows = buildExportRows({ userId: "STU-1", attendance: [att("1", "a", "Present", 1.5), att("2", "b", "Absent", 0), att("3", "c", "Late", 1)], schedule: [slot("a", "2026-09-10"), slot("b", "2026-09-17"), slot("c", "2026-10-01"), slot("g", "2026-10-05")], enrollments: enr, today: TODAY });
  it("summarises per month, in order", () => {
    expect(summarizeMonths(rows)).toEqual([
      { month: "2026-09", sessions: 2, present: 1, late: 0, absent: 1, notLogged: 0, hours: 1.5 },
      { month: "2026-10", sessions: 2, present: 0, late: 1, absent: 0, notLogged: 1, hours: 1 },
    ]);
  });
  it("filters by month range, either end open", () => {
    expect(filterMonths(rows, "2026-10", "").every((r) => r.month === "2026-10")).toBe(true);
    expect(filterMonths(rows, "", "2026-09").length).toBe(2);
    expect(filterMonths(rows, "2026-09", "2026-10").length).toBe(rows.length);
    expect(filterMonths(rows, "2027-01", "")).toEqual([]);
  });
  it("labels months in words", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthLabel("")).toBe("No date");
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(safeCell('Hello, "world"')).toBe('"Hello, ""world"""');
    expect(safeCell("a\nb")).toBe('"a\nb"');
  });
  it("defuses spreadsheet formulas but leaves numbers alone", () => {
    expect(safeCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(safeCell("+1 call")).toBe("'+1 call");
    expect(safeCell("-5")).toBe("-5");
    expect(safeCell(-1.5)).toBe("-1.5");
    expect(safeCell("@name")).toBe("'@name");
  });
  it("starts with a byte order mark and ends lines with CRLF", () => {
    const csv = toCsv(["A", "B"], [[1, "x,y"]]);
    expect(csv.startsWith("﻿A,B\r\n")).toBe(true);
    expect(csv.endsWith('1,"x,y"\r\n')).toBe(true);
  });
  it("builds a safe file name", () => {
    expect(exportFilename("Riddhi Pund", "monthly", "2026-09", "")).toBe("DC_Attendance_Riddhi_Pund_monthly_2026-09_to_now.csv");
    expect(exportFilename("../../x y", "sessions", "", "")).toBe("DC_Attendance_x_y_sessions.csv");
  });
});

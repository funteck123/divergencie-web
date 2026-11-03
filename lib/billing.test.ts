import { describe, expect, it } from "vitest";
import { ATTENDED_STATUSES, carryOverLineItems, computeHoursAndAmount, nextMonthOf } from "./billing";

// One student, one service, three one-hour sessions in October 2026. attendance: what was logged for each session.
function hours(attendance: { id: string; status?: string; hours: number }[], opts: Record<string, unknown> = {}) {
  const db = {
    services: [{ ServiceID: "SVC-1", Name: "Physics", Type: "Course", Rates: [{ RateID: "R1", Currency: "INR", Rate: 100, BillingType: "Hourly" }] }],
    enrollments: [{ UserID: "STU-1", ServiceID: "SVC-1", RateID: "R1" }],
    scheduleItems: ["S1", "S2", "S3"].map((id, i) => ({ ScheduleID: id, ServiceID: "SVC-1", Date: `2026-10-0${i + 1}`, Duration: 1 })),
    attendanceItems: attendance.map((a) => ({ AttendanceID: `A-${a.id}`, UserID: "STU-1", ScheduleItemID: a.id, ...(a.status ? { Status: a.status } : {}), LoggedDuration: a.hours })),
  };
  // the tests leave out the optional batch filter, which the function accepts missing
  return computeHoursAndAmount(db, { userId: "STU-1", serviceId: "SVC-1", year: 2026, month: 10, ...opts } as Parameters<typeof computeHoursAndAmount>[1]).attendedHours as number;
}

describe("attended hours (TKT-0374)", () => {
  it("counts Present and Late, not Absent", () => {
    expect(ATTENDED_STATUSES).toEqual(["Present", "Late"]);
    expect(hours([{ id: "S1", status: "Present", hours: 1 }, { id: "S2", status: "Late", hours: 1 }, { id: "S3", status: "Absent", hours: 1 }])).toBe(2);
  });
  it("an Absent record with a duration is worth 0, a Present one with the same duration is worth its hours", () => {
    expect(hours([{ id: "S1", status: "Absent", hours: 1 }])).toBe(0);
    expect(hours([{ id: "S1", status: "Present", hours: 1 }])).toBe(1);
  });
  it("a Present record keeps its own logged hours, not the scheduled ones", () => expect(hours([{ id: "S1", status: "Present", hours: 0.5 }])).toBe(0.5));
  it("a record with no Status counts as Present (the API default)", () => expect(hours([{ id: "S1", hours: 1 }])).toBe(1));
  it("a session with no record counts only when the caller assumes it was attended", () => {
    expect(hours([{ id: "S1", status: "Present", hours: 1 }])).toBe(1);
    expect(hours([{ id: "S1", status: "Present", hours: 1 }], { assumePresentIfUnlogged: true })).toBe(3);
  });
  it("an Absent record is not turned into attendance by assumePresentIfUnlogged: someone logged that session", () => {
    expect(hours([{ id: "S1", status: "Absent", hours: 1 }], { assumePresentIfUnlogged: true })).toBe(2);
  });
});

describe("carry over to next month (TKT-0406)", () => {
  it("moves to the next month and rolls December into January", () => {
    expect(nextMonthOf(2026, 10)).toEqual({ year: 2026, month: 11 });
    expect(nextMonthOf(2026, 12)).toEqual({ year: 2027, month: 1 });
    expect(nextMonthOf("2026", "1")).toEqual({ year: 2026, month: 2 });
  });
  it("copies subject, batch, amount and currency but not hours or notes", () => {
    const src = { LineItems: [{ ServiceID: "S1", BatchID: "B1", ScheduledHours: 13, AttendedHours: 9, Amount: 7560, Currency: "INR", Note: "missed 4 classes", HasAttendanceConflict: true }, { ServiceID: "S2", Amount: "3780", Currency: "INR" }] };
    expect(carryOverLineItems(src)).toEqual([
      { ServiceID: "S1", BatchID: "B1", ScheduledHours: null, AttendedHours: null, Amount: 7560, Currency: "INR" },
      { ServiceID: "S2", BatchID: "", ScheduledHours: null, AttendedHours: null, Amount: 3780, Currency: "INR" },
    ]);
  });
  it("a one-off invoice has no line items and is not carried over", () => expect(carryOverLineItems({ ServiceID: "S1", Amount: 500 })).toBeNull());
});

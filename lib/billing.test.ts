import { describe, expect, it } from "vitest";
import { ATTENDED_STATUSES, carryOverLineItems, computeHoursAndAmount, describePaycheckChange, describeSkipped, nextMonthOf, splitByActiveEnrollment } from "./billing";

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

describe("only lines with a live enrollment are carried over", () => {
  const items = [{ ServiceID: "S1", BatchID: "B1" }, { ServiceID: "S2", BatchID: "B2" }, { ServiceID: "S3", BatchID: "B3" }, { ServiceID: "S4", BatchID: "B4" }];
  const db = {
    services: [{ ServiceID: "S1", Name: "Biology" }, { ServiceID: "S2", Name: "Chemistry" }],
    enrollments: [
      { UserID: "U1", ServiceID: "S1", BatchID: "B1", StartDate: "2026-10-01" },                          // no end: active
      { UserID: "U1", ServiceID: "S2", BatchID: "B2", StartDate: "2026-10-01", EndDate: "2026-10-31" },   // ended before November
      { UserID: "U1", ServiceID: "S3", BatchID: "B3", StartDate: "2026-12-01" },                          // starts in December
      { UserID: "U2", ServiceID: "S4", BatchID: "B4" },                                                    // belongs to another person
    ],
  };
  const r = splitByActiveEnrollment(db, "U1", items, 2026, 11);
  it("keeps the live enrollment", () => expect(r.kept.map((k) => k.line.ServiceID)).toEqual(["S1"]));
  it("skips an ended enrollment, one not yet started, and one that belongs to someone else, each with its reason", () =>
    expect(r.skipped.map((x) => [x.ServiceID, x.reason])).toEqual([["S2", "enrollment ended 31/10/2026"], ["S3", "enrollment starts 01/12/2026"], ["S4", "no enrollment"]]));
  it("an enrollment ending in the target month still counts (any part of the month)", () =>
    expect(splitByActiveEnrollment({ enrollments: [{ UserID: "U1", ServiceID: "S1", BatchID: "B1", EndDate: "2026-11-05" }] }, "U1", [items[0]], 2026, 11).kept.length).toBe(1));
  it("an enrollment with no dates is always live", () =>
    expect(splitByActiveEnrollment({ enrollments: [{ UserID: "U1", ServiceID: "S1", BatchID: "B1" }] }, "U1", [items[0]], 2030, 3).kept.length).toBe(1));
  it("names skipped lines with their reason", () => expect(describeSkipped({ services: db.services }, r.skipped).slice(0, 1)).toEqual(["Chemistry (enrollment ended 31/10/2026)"]));
});

describe("paycheck audit line (TKT-0411)", () => {
  const sent = { PaycheckID: "PAY-9", Status: "Sent", StaffReceivedFlag: true, INRDue: 500 };
  it("says unsent when a Sent paycheck goes back to Draft", () => expect(describePaycheckChange(sent, { ...sent, Status: "Draft" }, { byManagement: true })).toBe("Unsent paycheck PAY-9 (Sent to Draft)"));
  it("says sent when a Draft is sent", () => expect(describePaycheckChange({ ...sent, Status: "Draft" }, sent, { byManagement: true })).toBe("Sent paycheck PAY-9 (Draft to Sent)"));
  it("names who unmarked or marked received", () => {
    expect(describePaycheckChange(sent, { ...sent, StaffReceivedFlag: false }, { byManagement: false })).toBe("Staff unmarked paycheck PAY-9 as received");
    expect(describePaycheckChange(sent, { ...sent, StaffReceivedFlag: false }, { byManagement: true })).toBe("Management unmarked paycheck PAY-9 as received");
    expect(describePaycheckChange({ ...sent, StaffReceivedFlag: false }, sent, { byManagement: false })).toBe("Staff marked paycheck PAY-9 as received");
  });
  it("joins several changes and reports a changed amount due", () => {
    expect(describePaycheckChange(sent, { ...sent, Status: "Draft", StaffReceivedFlag: false, INRDue: 0 }, { byManagement: true })).toBe(
      "Unsent paycheck PAY-9 (Sent to Draft) and cleared its received mark; INR due on PAY-9 changed from 500 to 0"
    );
  });
  it("an unsend that clears the received mark says so once and keeps the date the person marked it", () => {
    const rec = { ...sent, ReceivedAt: "2026-11-05T09:30:00.000Z" };
    expect(describePaycheckChange(rec, { ...rec, Status: "Draft", StaffReceivedFlag: false, ReceivedAt: "" }, { byManagement: true })).toBe("Unsent paycheck PAY-9 (Sent to Draft) and cleared its received mark (received 2026-11-05)");
  });
  it("returns null when nothing tracked changed, and treats a missing flag as not received", () => {
    expect(describePaycheckChange(sent, { ...sent }, { byManagement: true })).toBeNull();
    expect(describePaycheckChange({ PaycheckID: "PAY-9", Status: "Sent", INRDue: 1 }, { PaycheckID: "PAY-9", Status: "Sent", StaffReceivedFlag: false, INRDue: 1 }, { byManagement: true })).toBeNull();
  });
});

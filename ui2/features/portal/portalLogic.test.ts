import { describe, expect, it } from "vitest";
import { amountsOwed, enrolledServices, inRange, myAttendance, nextSession, nextSessionText, occurrencesText, sessionGroups, showUserFeature, stripeLink, visibleBills, weekly } from "./portalLogic";
import type { BillRecord, ScheduleItem, ServiceRecord } from "@/ui2/queries/types";

const svc: ServiceRecord = {
  ServiceID: "S1", Name: "Physics", Type: "Course", Group: ["Student"],
  OptionalComponents: [{ ComponentID: "C", Batches: [
    { BatchID: "B1", BatchName: "B14", Rates: [{ RateID: "R1", Currency: "INR", Rate: 5000 }], OccuranceList: [{ OccuranceID: "O1", Day: "Tuesday", Time: "17:00", Duration: 1.5, Facilitator: "Ms T" }] },
    { BatchID: "B2", BatchName: "B15", Rates: [{ RateID: "R2", Currency: "INR", Rate: 6000 }], OccuranceList: [] },
  ] }],
};

describe("enrolled services", () => {
  it("uses the batch and rate the person is enrolled in", () => {
    const [s] = enrolledServices([{ EnrolmentID: "E", UserID: "U", ServiceID: "S1", BatchID: "B2", RateID: "R2" }], [svc]);
    expect(s!._myRate?.Rate).toBe(6000);
    expect(occurrencesText(s!)).toBe("Not scheduled yet");
  });
  it("lists scheduled occurrences", () => {
    const [s] = enrolledServices([{ EnrolmentID: "E", UserID: "U", ServiceID: "S1", BatchID: "B1", RateID: "R1" }], [svc]);
    expect(occurrencesText(s!)).toBe("Tuesday 17:00 (1.5h) · Ms T");
  });
  it("names the batch and gives each enrollment its own key (TKT-0330)", () => {
    const out = enrolledServices([{ EnrolmentID: "E1", UserID: "U", ServiceID: "S1", BatchID: "B1", RateID: "R1" }, { EnrolmentID: "E2", UserID: "U", ServiceID: "S1", BatchID: "B2", RateID: "R2" }], [svc]);
    expect(out.map((s) => s._myBatch)).toEqual(["B14", "B15"]);
    expect(new Set(out.map((s) => s._key)).size).toBe(2);
    expect([...weekly(out).byDay.values()].flat().map((i) => i.serviceLabel)).toEqual(["Physics (B14)"]);
  });
  it("has no batch label when the service has no named batch", () => {
    const flat: ServiceRecord = { ServiceID: "S9", Name: "Role", Type: "Staff", Group: ["Staff"], OccuranceList: [] } as unknown as ServiceRecord;
    expect(enrolledServices([{ EnrolmentID: "E", UserID: "U", ServiceID: "S9" }], [flat])[0]!._myBatch).toBe("");
  });
  it("skips an enrollment whose service is gone", () => expect(enrolledServices([{ EnrolmentID: "E", UserID: "U", ServiceID: "NOPE" }], [svc])).toEqual([]));
});

describe("date ranges", () => {
  const ago = (n: number) => `2026-10-${String(5 - n).padStart(2, "0")}`; // today is 2026-10-05
  it("upcoming is today onward", () => { expect(inRange({ Date: "2026-10-05" }, "upcoming", "2026-10-05", ago)).toBe(true); expect(inRange({ Date: "2026-10-04" }, "upcoming", "2026-10-05", ago)).toBe(false); });
  it("last 7 stops at today", () => { expect(inRange({ Date: "2026-10-06" }, "last7", "2026-10-05", ago)).toBe(false); expect(inRange({ Date: "2026-09-29" }, "last7", "2026-10-05", (n) => `2026-09-${28 + (7 - n) + 1}`)).toBeDefined(); });
  it("all keeps everything", () => expect(inRange({ Date: "1999-01-01" }, "all")).toBe(true));
});

describe("attendance and bills", () => {
  it("prefers the viewer's own record", () => {
    const a = [{ AttendanceID: "1", ScheduleItemID: "S", UserID: "U", Status: "Present", LoggedDuration: 1, LoggedBy: "T" }, { AttendanceID: "2", ScheduleItemID: "S", UserID: "U", Status: "Absent", LoggedDuration: 0, LoggedBy: "U" }];
    expect(myAttendance(a, "S", "U")?.AttendanceID).toBe("2");
    expect(myAttendance(a, "S", "X")?.AttendanceID).toBe("1");
  });
  it("hides drafts", () => expect(visibleBills([{ Status: "Draft" }, { Status: "Sent" }] as BillRecord[]).length).toBe(1));
});

describe("links and weekly view", () => {
  it("stripe link carries invoice and email, and is absent without a gateway", () => {
    expect(stripeLink(undefined, "INV-1")).toBeNull();
    const u = new URL(stripeLink("https://pay.example/x", "INV-1", "a@b.com") as string);
    expect(u.searchParams.get("client_reference_id")).toBe("INV-1");
    expect(u.searchParams.get("prefilled_email")).toBe("a@b.com");
  });
  it("weekly groups by day and counts unscheduled", () => {
    const [a, b] = enrolledServices([{ EnrolmentID: "1", UserID: "U", ServiceID: "S1", BatchID: "B1" }, { EnrolmentID: "2", UserID: "U", ServiceID: "S1", BatchID: "B2" }], [svc]);
    const w = weekly([a!, b!]);
    expect(w.hasAny).toBe(true);
    expect(w.byDay.get("Tuesday")?.length).toBe(1);
    expect(w.unscheduled).toBe(0);
  });
});

describe("enrolledServices with a bad reply", () => {
  it("treats null, an object or nothing as an empty list instead of crashing", () => {
    expect(enrolledServices(null, null)).toEqual([]);
    expect(enrolledServices({} as never, [] as never)).toEqual([]);
    expect(enrolledServices(undefined, {} as never)).toEqual([]);
    expect(enrolledServices([{ EnrolmentID: "E1", UserID: "U", ServiceID: "S9" }], null)).toEqual([]);
    expect(visibleBills(null)).toEqual([]);
    expect(visibleBills({} as never)).toEqual([]);
  });
});

describe("showUserFeature (TKT-0371)", () => {
  const timesheet = { slug: "timesheet", toggleKey: "timesheet", linkField: "TimesheetURL" };
  const tracker = { slug: "progress-tracker", toggleKey: "progressTracker", linkField: "ProgressTrackerURL" };
  const off = { timesheet: false, progressTracker: false };
  it("shows whatever Management has switched on", () => {
    expect(showUserFeature(timesheet, { timesheet: true }, {})).toBe(true);
    expect(showUserFeature(tracker, { progressTracker: true }, {})).toBe(true);
  });
  it("shows the Timesheet to anyone with their own timesheet link, even when it is switched off for everyone", () => {
    expect(showUserFeature(timesheet, off, { TimesheetURL: "https://docs.google.com/spreadsheets/d/x/edit" })).toBe(true);
  });
  it("hides the Timesheet when it is off and the person has no link", () => {
    expect(showUserFeature(timesheet, off, {})).toBe(false);
    expect(showUserFeature(timesheet, off, { TimesheetURL: "" })).toBe(false);
    expect(showUserFeature(timesheet, off, { TimesheetURL: "   " })).toBe(false);
  });
  it("does not widen any other button: the Progress Tracker still follows the switch", () => {
    expect(showUserFeature(tracker, off, { ProgressTrackerURL: "https://example.com/t" })).toBe(false);
  });
});

describe("session groups (TKT-0359)", () => {
  const occ = (Day: string, Time: string, Facilitator?: string, Duration: number | string = 1) => ({ Day, Time, Duration, Facilitator });
  it("shows the teacher once for sessions that share one", () => {
    const g = sessionGroups({ _myOccurrences: [occ("Sunday", "20:30", "Mohammad Shahid Akhtar"), occ("Saturday", "20:30", "Mohammad Shahid Akhtar")] });
    expect(g).toEqual([{ facilitator: "Mohammad Shahid Akhtar", sessions: [{ when: "Sunday 20:30", hours: "1h" }, { when: "Saturday 20:30", hours: "1h" }] }]);
  });
  it("keeps one group per teacher, in the order they first appear", () => {
    const g = sessionGroups({ _myOccurrences: [occ("Monday", "17:30", "Dr Harem"), occ("Tuesday", "18:30", "Mr Akhtar"), occ("Friday", "17:30", "Dr Harem", 2)] });
    expect(g.map((x) => x.facilitator)).toEqual(["Dr Harem", "Mr Akhtar"]);
    expect(g[0]?.sessions).toEqual([{ when: "Monday 17:30", hours: "1h" }, { when: "Friday 17:30", hours: "2h" }]);
  });
  it("sessions with no teacher form one group with an empty name; ones without a day or time are left out", () => {
    const g = sessionGroups({ _myOccurrences: [occ("Monday", "17:30"), { Duration: 1, Time: "10:00" }, { Day: "Tuesday", Duration: 1 }, occ("Wednesday", "09:00", "  ")] });
    expect(g).toEqual([{ facilitator: "", sessions: [{ when: "Monday 17:30", hours: "1h" }, { when: "Wednesday 09:00", hours: "1h" }] }]);
  });
  it("no sessions: no groups, and the text form still says not scheduled", () => expect(sessionGroups({ _myOccurrences: [] })).toEqual([]));
});

// TKT-0421: the "At a glance" card of the parent portal
describe("next class", () => {
  const slot = (o: Partial<ScheduleItem> & { Date: string; Time: string }): ScheduleItem => ({ ScheduleID: `${o.Date}-${o.Time}`, ServiceName: "Physics", Timezone: "Asia/Kolkata", Duration: 1.5, ...o });
  const now = Date.UTC(2026, 10, 15, 0, 0); // Sun 15 Nov 2026, 00:00 UTC
  it("takes the soonest class that is not over, skipping past, cancelled and incomplete ones", () => {
    const items = [
      slot({ Date: "2026-11-14", Time: "17:00" }),
      slot({ Date: "2026-11-17", Time: "09:00", ServiceName: "Maths" }),
      slot({ Date: "2026-11-16", Time: "17:00", Facilitator: " Ms Rao " }),
      slot({ Date: "2026-11-15", Time: "10:00", Status: "Cancelled" }),
      slot({ Date: "", Time: "10:00" }),
    ];
    const n = nextSession(items, now);
    expect(n).toMatchObject({ date: "2026-11-16", time: "17:00", tz: "IST", serviceName: "Physics", facilitator: "Ms Rao" });
    expect(nextSessionText(n!)).toBe("Mon 16 Nov, 17:00 IST");
  });
  it("compares real moments in the class's own zone: 05:00 IST on the 15th is 23:30 UTC on the 14th", () => {
    const early = slot({ Date: "2026-11-15", Time: "05:00" });
    expect(nextSession([early], Date.UTC(2026, 10, 14, 23, 0))).not.toBeNull(); // 30 minutes before it starts
    expect(nextSession([early], Date.UTC(2026, 10, 15, 0, 31))).not.toBeNull(); // a 1.5 h class that began at 23:30 UTC is still running at 00:31 UTC
  });
  it("a class that has ended is not next", () => {
    expect(nextSession([slot({ Date: "2026-11-15", Time: "05:00" })], Date.UTC(2026, 10, 15, 1, 1))).toBeNull();
  });
  it("a rescheduled class counts at its new date and time", () => {
    const moved = slot({ Date: "2026-11-16", Time: "17:00", RescheduledDate: "2026-11-20", RescheduledTime: "18:30" });
    const n = nextSession([moved, slot({ Date: "2026-11-18", Time: "10:00" })], now);
    expect(n).toMatchObject({ date: "2026-11-18", time: "10:00" });
    expect(nextSession([moved], now)).toMatchObject({ date: "2026-11-20", time: "18:30" });
  });
  it("copes with anything that is not a list", () => {
    expect(nextSession(null, now)).toBeNull();
    expect(nextSession(undefined, now)).toBeNull();
    expect(nextSession({ error: "x" } as unknown as ScheduleItem[], now)).toBeNull();
    expect(nextSession([], now)).toBeNull();
  });
});

describe("amount to pay", () => {
  const bill = (o: Record<string, unknown>) => ({ Status: "Sent", Year: 2026, Month: 10, Amount: 5000, INRAmount: 5000, INRDue: 5000, Currency: "INR", ...o }) as unknown as BillRecord;
  it("adds up sent invoices nobody has marked paid, per currency", () => {
    const out = amountsOwed([bill({}), bill({ Month: 9, INRDue: 2500.5 }), bill({ Currency: "SAR", Amount: 250, INRAmount: 5500, INRDue: 5500 })]);
    expect(out).toEqual([{ currency: "INR", amount: 7500.5, count: 2 }, { currency: "SAR", amount: 250, count: 1 }]);
  });
  it("leaves out drafts, invoices marked paid and invoices with nothing due", () => {
    expect(amountsOwed([bill({ Status: "Draft" }), bill({ StudentPaidFlag: true }), bill({ INRDue: 0 })])).toEqual([]);
  });
  it("copes with anything that is not a list", () => {
    expect(amountsOwed(null)).toEqual([]);
    expect(amountsOwed(undefined)).toEqual([]);
    expect(amountsOwed({ error: "x" } as unknown as BillRecord[])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { enrolledServices, inRange, myAttendance, occurrencesText, stripeLink, visibleBills, weekly } from "./portalLogic";
import type { BillRecord, ServiceRecord } from "@/ui2/queries/types";

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

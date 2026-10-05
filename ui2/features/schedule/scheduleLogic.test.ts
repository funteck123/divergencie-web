import { describe, expect, it } from "vitest";
import { agenda, attendanceFor, conflictingScheduleIds, dropPast, matchesSearch, occurrenceNumbers, serviceSlots, dayTimeline } from "./scheduleLogic";
import type { AttendanceItem, ScheduleItem } from "@/ui2/queries/types";

const a = (o: Partial<AttendanceItem>): AttendanceItem => ({ AttendanceID: "A", ScheduleItemID: "S1", UserID: "U1", Status: "Present", LoggedDuration: 1, LoggedBy: "U1", ...o });
const s = (o: Partial<ScheduleItem>): ScheduleItem => ({ ScheduleID: "S1", Date: "2026-10-05", Time: "10:00", Duration: 1, ServiceID: "SV", OccuranceID: "O1", ...o });

describe("attendance conflicts", () => {
  it("two records that agree are not a conflict", () => expect(conflictingScheduleIds([a({ AttendanceID: "1" }), a({ AttendanceID: "2", LoggedBy: "T" })]).size).toBe(0));
  it("different status is a conflict", () => expect([...conflictingScheduleIds([a({ AttendanceID: "1" }), a({ AttendanceID: "2", Status: "Absent" })])]).toEqual(["S1"]));
  it("different hours is a conflict", () => expect(conflictingScheduleIds([a({ AttendanceID: "1" }), a({ AttendanceID: "2", LoggedDuration: 2 })]).size).toBe(1));
  it("a single record or different people are not", () => expect(conflictingScheduleIds([a({ AttendanceID: "1" }), a({ AttendanceID: "2", UserID: "U2", Status: "Absent" })]).size).toBe(0));
  it("the accepted record counts for the session", () => expect(attendanceFor([a({ AttendanceID: "1", AcceptedForBilling: false }), a({ AttendanceID: "2" })], "S1")?.AttendanceID).toBe("2"));
});

describe("schedule lists", () => {
  it("service slots need an occurrence and an enrollment", () => {
    const items = [s({}), s({ ScheduleID: "S2", OccuranceID: null }), s({ ScheduleID: "S3", ServiceID: "OTHER" })];
    expect(serviceSlots(items, [{ EnrolmentID: "E", UserID: "U", ServiceID: "SV" }]).map((x) => x.ScheduleID)).toEqual(["S1"]);
  });
  it("past sessions are dropped unless asked for", () => {
    const items = [s({ Date: "2026-10-01" }), s({ ScheduleID: "S2", Date: "2026-10-09" })];
    expect(dropPast(items, false, "2026-10-05").map((x) => x.ScheduleID)).toEqual(["S2"]);
    expect(dropPast(items, true, "2026-10-05").length).toBe(2);
  });
  it("search matches service name or instructor", () => {
    expect(matchesSearch(s({ ServiceName: "Physics", Facilitator: "Ms Rao" }), "rao")).toBe(true);
    expect(matchesSearch(s({ ServiceName: "Physics" }), "chem")).toBe(false);
  });
  it("occurrence numbers count by date inside one recurring slot", () => {
    const m = occurrenceNumbers([s({ ScheduleID: "B", Date: "2026-10-12" }), s({ ScheduleID: "A", Date: "2026-10-05" })]);
    expect([m.get("A"), m.get("B")]).toEqual([1, 2]);
  });
  it("agenda groups by date in order", () => {
    const g = agenda([s({ ScheduleID: "x", Date: "2026-10-06", Time: "09:00" }), s({ ScheduleID: "y", Date: "2026-10-05", Time: "11:00" }), s({ ScheduleID: "z", Date: "2026-10-05", Time: "08:00" })]);
    expect(g.map((d) => d.date)).toEqual(["2026-10-05", "2026-10-06"]);
    expect(g[0]!.items.map((i) => i.ScheduleID)).toEqual(["z", "y"]);
  });
});

describe("day timeline (TKT-0324)", () => {
  const mk = (id: string, who: string, time: string, dur: number, extra: Record<string, unknown> = {}) => ({ ScheduleID: id, ServiceName: `Svc ${id}`, Date: "2026-10-06", Time: time, Timezone: "Asia/Kolkata", Duration: dur, Facilitator: who, ...extra });
  it("makes one row per instructor, in time order, only for that day", () => {
    const t = dayTimeline([mk("b", "Zed", "18:00", 1), mk("a", "Amy", "16:00", 1), mk("a2", "Amy", "09:00", 1), mk("x", "Amy", "16:00", 1, { Date: "2026-10-07" })], "2026-10-06");
    expect(t.rows.map((r) => r.name)).toEqual(["Amy", "Zed"]);
    expect(t.rows[0]!.bars.map((b) => b.id)).toEqual(["a2", "a"]);
  });
  it("marks overlapping sessions of one instructor, not touching ones or different instructors", () => {
    const t = dayTimeline([mk("a", "Amy", "16:00", 1.5), mk("b", "Amy", "17:00", 1), mk("c", "Amy", "18:00", 1), mk("d", "Bo", "16:30", 1)], "2026-10-06");
    const amy = t.rows.find((r) => r.name === "Amy")!;
    expect(amy.bars.map((b) => [b.id, b.conflict])).toEqual([["a", true], ["b", true], ["c", false]]);
    expect(t.rows.find((r) => r.name === "Bo")!.bars[0]!.conflict).toBe(false);
    expect(t.conflicts.map((s) => s.ScheduleID).sort()).toEqual(["a", "b"]);
  });
  it("lines up different timezones and follows a moved session", () => {
    const riyadh = mk("r", "Amy", "14:00", 1, { Timezone: "Asia/Riyadh" }); // 16:30 India
    expect(dayTimeline([riyadh], "2026-10-06").rows[0]!.bars[0]!.time).toBe("16:30");
    const moved = mk("m", "Amy", "10:00", 1, { RescheduledDate: "2026-10-07", RescheduledTime: "11:00" });
    expect(dayTimeline([moved], "2026-10-06").rows).toEqual([]);
    expect(dayTimeline([moved], "2026-10-07").rows[0]!.bars[0]!.time).toBe("11:00");
  });
  it("never flags a conflict for sessions with no instructor set", () => {
    expect(dayTimeline([mk("a", "", "10:00", 1), mk("b", "", "10:00", 1)], "2026-10-06").conflicts).toEqual([]);
  });
  it("gives the axis room and a sensible empty default", () => {
    const t = dayTimeline([mk("a", "Amy", "16:00", 1)], "2026-10-06");
    expect(t.fromHour).toBe(15); expect(t.toHour).toBeGreaterThanOrEqual(21);
    expect(dayTimeline([], "2026-10-06")).toMatchObject({ rows: [], fromHour: 8, toHour: 20 });
  });
});

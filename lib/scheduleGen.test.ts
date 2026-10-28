import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ensureScheduleGenerated reaches the database only through nextId and insertScheduleItemsDedup; both are replaced here.
let counter = 0;
vi.mock("./db", () => ({
  nextId: async (_db: unknown, prefix: string) => `${prefix}-NEW${++counter}`,
  insertScheduleItemsDedup: async (db: { scheduleItems: unknown[] }, rows: unknown[]) => {
    db.scheduleItems.push(...rows);
  },
}));
import { ensureScheduleGenerated } from "./scheduleGen";

// "Today" is Monday 2026-10-26. A weekly class whose slot is now Sunday 20:30 (it used to be Saturday).
const TODAY = new Date("2026-10-26T12:00:00");
type Item = { ScheduleID: string; OccuranceID: string; Date: string; Time: string; RescheduledDate?: string; [k: string]: unknown };

function world(items: Item[], day = "Sunday") {
  const occ = { OccuranceID: "OCC-1", Day: day, Time: "20:30", Timezone: "UTC", Duration: 1, Facilitator: "T" };
  return {
    services: [{ ServiceID: "SVC-1", Name: "Physics", Type: "Course", Group: "Student", EndDate: "2026-11-02", OptionalComponents: [{ Batches: [{ BatchID: "B1", BatchName: "One", StartDate: "2026-11-01", OccuranceList: [occ] }] }] }],
    enrollments: [],
    scheduleItems: items,
  };
}
const row = (id: string, date: string, extra: Record<string, unknown> = {}): Item => ({ ScheduleID: id, OccuranceID: "OCC-1", Date: date, Time: "20:30", ServiceName: "Physics", ServiceType: "Course", ServiceGroup: ["Student"], BatchID: "B1", BatchName: "One", Timezone: "UTC", Duration: 1, Facilitator: "T", ...extra });
const dates = (db: { scheduleItems: Item[] }) => db.scheduleItems.map((s) => s.Date).sort();

describe("a class that moved to another weekday (TKT-0373)", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(TODAY); counter = 0; });
  afterEach(() => vi.useRealTimers());

  it("moves an upcoming row from the old weekday to the new one in the same week, and keeps its id", async () => {
    const db = world([row("SCH-OLD", "2026-10-31")]); // Saturday 31 Oct, the occurrence is now Sunday
    expect(await ensureScheduleGenerated(db)).toBeGreaterThan(0);
    const moved = db.scheduleItems.find((s) => s.ScheduleID === "SCH-OLD")!;
    expect(moved.Date).toBe("2026-11-01"); // Sunday of that week
  });

  it("does not leave two rows for the same slot", async () => {
    const db = world([row("SCH-OLD", "2026-10-31")]);
    await ensureScheduleGenerated(db);
    const d = dates(db);
    expect(new Set(d).size).toBe(d.length);
    expect(d).toEqual(["2026-11-01"]); // the generator sees Sunday 1 Nov as taken
  });

  it("moves a Sunday row to Saturday of the same week when the class moves the other way", async () => {
    const db = world([row("SCH-OLD", "2026-11-01")], "Saturday"); // Sunday 1 Nov, the occurrence is now Saturday
    await ensureScheduleGenerated(db);
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-OLD")!.Date).toBe("2026-10-31");
  });

  it("leaves a rescheduled row alone: it has its own date on purpose", async () => {
    const db = world([row("SCH-R", "2026-10-31", { RescheduledDate: "2026-10-30" })]);
    await ensureScheduleGenerated(db);
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-R")!.Date).toBe("2026-10-31");
  });

  it("leaves a past row alone", async () => {
    const db = world([row("SCH-PAST", "2026-10-24")]); // Saturday 24 Oct, already happened
    await ensureScheduleGenerated(db);
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-PAST")!.Date).toBe("2026-10-24");
  });

  it("does not move a row onto a date that already has one for the same class", async () => {
    const db = world([row("SCH-OLD", "2026-10-31"), row("SCH-REAL", "2026-11-01")]);
    await ensureScheduleGenerated(db);
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-OLD")!.Date).toBe("2026-10-31");
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-REAL")!.Date).toBe("2026-11-01");
  });

  it("does not move a row to a day that is already past this week", async () => {
    // Today is Monday 26 Oct. A row on Tuesday 27 Oct whose class is now Monday: Monday of that week is today, not upcoming.
    const db = world([row("SCH-OLD", "2026-10-27")], "Monday");
    await ensureScheduleGenerated(db);
    expect(db.scheduleItems.find((s) => s.ScheduleID === "SCH-OLD")!.Date).toBe("2026-10-27");
  });

  it("changes nothing when every upcoming row is already on the right weekday", async () => {
    const db = world([row("SCH-OK", "2026-11-01")]);
    expect(await ensureScheduleGenerated(db)).toBe(0);
    expect(dates(db)).toEqual(["2026-11-01"]);
  });
});

import { describe, expect, it } from "vitest";
import { DAYS, atomKey, rectangleCells, buildTimeMessage, cellState, clockLabel, formatRange, paintCells, rangesForDay, rowMinutes, utcOffsetLabel } from "./timePickerLogic";

const empty = new Set<string>();

describe("rows and labels", () => {
  it("hourly rows run 6 AM to 11 PM, half-hour rows double them", () => {
    expect(rowMinutes(false)[0]).toBe(0);
    expect(rowMinutes(false).at(-1)).toBe(23 * 60);
    expect(rowMinutes(false)).toHaveLength(24);
    expect(rowMinutes(true)).toHaveLength(48);
    expect(rowMinutes(true).at(-1)).toBe(23 * 60 + 30);
  });
  it("12-hour labels", () => {
    expect(clockLabel(19 * 60)).toBe("7:00 PM");
    expect(clockLabel(21 * 60 + 30)).toBe("9:30 PM");
    expect(clockLabel(6 * 60)).toBe("6:00 AM");
    expect(clockLabel(12 * 60)).toBe("12:00 PM");
    expect(clockLabel(1440)).toBe("12:00 AM");
  });
});

describe("selecting cells", () => {
  it("an hourly cell covers both half hours; a half-hour cell covers one", () => {
    const a = paintCells(empty, [{ day: "Saturday", minute: 21 * 60 }], true, false);
    expect([...a].sort()).toEqual([atomKey("Saturday", 1260), atomKey("Saturday", 1290)].sort());
    const b = paintCells(empty, [{ day: "Saturday", minute: 21 * 60 + 30 }], true, true);
    expect([...b]).toEqual([atomKey("Saturday", 1290)]);
  });
  it("painting off removes the atoms and does not change the old set", () => {
    const a = paintCells(empty, [{ day: "Monday", minute: 600 }], true, false);
    const b = paintCells(a, [{ day: "Monday", minute: 600 }], false, false);
    expect(a.size).toBe(2);
    expect(b.size).toBe(0);
  });
  it("an hourly cell with one half selected is 'half'", () => {
    const a = paintCells(empty, [{ day: "Monday", minute: 21 * 60 + 30 }], true, true);
    expect(cellState(a, "Monday", 21 * 60, false)).toBe("half");
    expect(cellState(a, "Monday", 21 * 60 + 30, true)).toBe("on");
    expect(cellState(a, "Monday", 22 * 60, false)).toBe("off");
  });
});

describe("ranges", () => {
  it("joins consecutive cells and keeps gaps apart", () => {
    const s = paintCells(empty, [{ day: "Tuesday", minute: 19 * 60 }, { day: "Tuesday", minute: 20 * 60 }, { day: "Tuesday", minute: 22 * 60 }], true, false);
    expect(rangesForDay(s, "Tuesday").map(formatRange)).toEqual(["7:00 PM to 9:00 PM", "10:00 PM to 11:00 PM"]);
    expect(rangesForDay(s, "Monday")).toEqual([]);
  });
  it("a half-hour start gives a half-hour window", () => {
    const s = paintCells(empty, [{ day: "Sunday", minute: 21 * 60 + 30 }], true, true);
    expect(rangesForDay(s, "Sunday").map(formatRange)).toEqual(["9:30 PM to 10:00 PM"]);
  });
  it("the last slot ends at midnight", () => {
    const s = paintCells(empty, [{ day: "Friday", minute: 23 * 60 }], true, false);
    expect(rangesForDay(s, "Friday").map(formatRange)).toEqual(["11:00 PM to 12:00 AM"]);
  });
});

describe("the message", () => {
  const base = { name: "Thanishka Reddy", role: "Student" as const, subject: "AS Level Computer Science", zoneName: "India", zoneOffset: "UTC+05:30", notes: "", selected: empty };
  it("lists only the days with times, in week order, with a branded header and sign-off", () => {
    const s = paintCells(empty, [{ day: "Sunday", minute: 21 * 60 }, { day: "Saturday", minute: 21 * 60 }, { day: "Saturday", minute: 22 * 60 }], true, false);
    expect(buildTimeMessage({ ...base, selected: s })).toBe(
      [
        "Hello DivergenCIE team! 😊",
        "",
        "DivergenCIE Preferred Class Times",
        "",
        "Name: Thanishka Reddy",
        "I am a: Student",
        "Subject: AS Level Computer Science",
        "Time zone: India, UTC+05:30",
        "",
        "Saturday: 9:00 PM to 11:00 PM",
        "Sunday: 9:00 PM to 10:00 PM",
        "",
        "Sent with the DivergenCIE time picker. Let us help you get A*. We care! ✨",
      ].join("\n"),
    );
  });
  it("leaves out an empty name, subject and notes, and says when nothing is chosen", () => {
    const m = buildTimeMessage({ ...base, name: " ", subject: "", selected: empty });
    expect(m).not.toContain("Name:");
    expect(m).not.toContain("Subject:");
    expect(m).not.toContain("Notes:");
    expect(m).toContain("No times chosen yet.");
  });
  it("adds the notes, with no brackets and no dash as a pause", () => {
    const s = paintCells(empty, [{ day: "Monday", minute: 600 }], true, false);
    const m = buildTimeMessage({ ...base, notes: "Not free in exam week", selected: s });
    expect(m).toContain("Notes: Not free in exam week");
    expect(m).not.toMatch(/—|–|\(|\)/);
  });
  it("covers all seven days in the order of the week", () => {
    expect(DAYS[0]).toBe("Monday");
    expect(DAYS[6]).toBe("Sunday");
  });
});

describe("time zone offset", () => {
  it("is written as UTC plus or minus hours and minutes", () => {
    const at = new Date("2026-11-24T00:00:00Z");
    expect(utcOffsetLabel("Asia/Kolkata", at)).toBe("UTC+05:30");
    expect(utcOffsetLabel("Asia/Riyadh", at)).toBe("UTC+03:00");
    expect(utcOffsetLabel("Europe/London", at)).toMatch(/^UTC(\+00:00)?$/);
    expect(utcOffsetLabel("Not/AZone", at)).toBe("");
  });
});

describe("rectangleCells", () => {
  const rows = rowMinutes(false);
  it("gives the box between two cells, in any drag direction", () => {
    const a = { day: "Monday" as const, minute: 20 * 60 }, b = { day: "Wednesday" as const, minute: 22 * 60 };
    expect(rectangleCells(rows, a, b)).toHaveLength(9);
    expect(rectangleCells(rows, b, a)).toHaveLength(9);
    expect(rectangleCells(rows, { day: "Sunday", minute: 22 * 60 }, { day: "Saturday", minute: 21 * 60 }).map((c) => `${c.day}${c.minute}`).sort()).toEqual(["Saturday1260", "Saturday1320", "Sunday1260", "Sunday1320"]);
  });
  it("one cell is a box of one", () => {
    expect(rectangleCells(rows, { day: "Friday", minute: 0 }, { day: "Friday", minute: 0 })).toHaveLength(1);
  });
});

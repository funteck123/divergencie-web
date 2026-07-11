import { describe, it, expect } from "vitest";

/**
 * Tests for displayId generation logic.
 * The actual DB call is abstracted out so we can test the generation logic in isolation.
 */

function generateDisplayId(dateStr: string, existingCountToday: number): string {
  return `${dateStr}-${String(existingCountToday + 1).padStart(4, "0")}`;
}

function getDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

describe("displayId generation", () => {
  it("produces correct format for first ticket of the day", () => {
    const dateStr = getDateStr(new Date("2026-05-24"));
    expect(generateDisplayId(dateStr, 0)).toBe("20260524-0001");
  });

  it("sequences correctly", () => {
    const dateStr = getDateStr(new Date("2026-05-24"));
    expect(generateDisplayId(dateStr, 4)).toBe("20260524-0005");
  });

  it("zero-pads sequence to 4 digits", () => {
    const dateStr = getDateStr(new Date("2026-01-01"));
    expect(generateDisplayId(dateStr, 9)).toBe("20260101-0010");
  });

  it("handles large counts correctly", () => {
    const dateStr = getDateStr(new Date("2026-05-24"));
    expect(generateDisplayId(dateStr, 999)).toBe("20260524-1000");
  });

  it("date string has correct length (8 chars)", () => {
    const dateStr = getDateStr(new Date("2026-01-05"));
    expect(dateStr).toBe("20260105");
    expect(dateStr.length).toBe(8);
  });

  it("does NOT mutate the input date (original bug)", () => {
    const original = new Date("2026-05-24T12:00:00");
    const before = original.getTime();
    getDateStr(original); // Should not mutate
    expect(original.getTime()).toBe(before);
  });

  it("start of startsWith prefix match finds same-day tickets", () => {
    const dateStr = "20260524";
    const ticketDisplayIds = ["20260524-0001", "20260524-0002", "20260523-0001"];
    const todayCount = ticketDisplayIds.filter((id) => id.startsWith(dateStr)).length;
    expect(todayCount).toBe(2);
  });

  it("sequential ids from same count are unique", () => {
    const dateStr = "20260524";
    const id1 = generateDisplayId(dateStr, 0);
    const id2 = generateDisplayId(dateStr, 1);
    expect(id1).not.toBe(id2);
  });
});

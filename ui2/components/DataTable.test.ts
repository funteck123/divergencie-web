import { describe, expect, it } from "vitest";
import { WINDOW_AFTER, visibleRange } from "./DataTable";

describe("visibleRange", () => {
  it("draws the rows in view plus a margin, never past the ends", () => {
    expect(visibleRange(1000, 0, 700, 35, 10)).toEqual([0, 30]);
    expect(visibleRange(1000, 3500, 700, 35, 10)).toEqual([90, 130]);
    expect(visibleRange(1000, 999999, 700, 35, 10)[1]).toBe(1000);
    expect(visibleRange(1000, 999999, 700, 35, 10)[0]).toBeLessThan(1000);
  });
  it("draws everything when it cannot measure", () => {
    expect(visibleRange(50, 0, 700, 0)).toEqual([0, 50]);
    expect(visibleRange(0, 0, 700, 35)).toEqual([0, 0]);
  });
  it("always draws at least one row", () => {
    const [a, b] = visibleRange(500, 17000, 0, 35, 0);
    expect(b).toBeGreaterThan(a);
  });
  it("keeps small tables whole", () => expect(WINDOW_AFTER).toBeGreaterThanOrEqual(50));
});

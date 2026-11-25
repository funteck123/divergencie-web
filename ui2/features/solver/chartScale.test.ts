import { describe, expect, it } from "vitest";
import { pickTicks, spreadScale } from "./chartScale";

const DAY = 86_400_000;

describe("spreadScale", () => {
  it("keeps order, runs from 0 to 1, and a single moment sits in the middle", () => {
    const at = spreadScale([5, 1, 9, 3]);
    expect([1, 3, 5, 9].map(at)).toEqual([...[1, 3, 5, 9].map(at)].sort((a, b) => a - b));
    expect(at(1)).toBe(0);
    expect(at(9)).toBeCloseTo(1, 10);
    expect(spreadScale([7, 7])(7)).toBe(0.5);
  });
  it("attempts minutes apart on a 90 day axis are no longer stacked", () => {
    const t0 = Date.UTC(2026, 8, 3);
    const xs = [t0, t0 + 5 * 60_000, t0 + 11 * 60_000, t0 + 90 * DAY];
    const at = spreadScale(xs);
    const plot = 650;
    const gaps = xs.slice(1).map((x, i) => (at(x) - at(xs[i] as number)) * plot);
    expect(Math.min(...gaps)).toBeGreaterThan(plot * 0.5 / (xs.length - 1) * 0.95); // never closer than half an even spacing
    // pure time would have put the first three within 0.1 px of each other
    const pure = xs.slice(1).map((x, i) => ((x - (xs[i] as number)) / (90 * DAY)) * plot);
    expect(Math.min(...pure.slice(0, 2))).toBeLessThan(0.1);
  });
  it("two series share one scale, so the same moment has the same place", () => {
    const at = spreadScale([1, 2, 3, 3, 4]);
    expect(at(3)).toBe(at(3));
  });
});

describe("pickTicks", () => {
  it("takes everything when there are few, else evenly spaced picks with both ends", () => {
    expect(pickTicks([3, 1, 2], 5)).toEqual([1, 2, 3]);
    const t = pickTicks(Array.from({ length: 21 }, (_, i) => i), 5);
    expect(t).toEqual([0, 5, 10, 15, 20]);
  });
});

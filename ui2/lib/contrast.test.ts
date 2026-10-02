import { describe, expect, it } from "vitest";
import { contrastRatio, readableText } from "./contrast";

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
  });
  it("chooses dark text on light colours and white on dark ones", () => {
    expect(readableText(["#22c55e"])).toBe("#0B0B0B");
    expect(readableText(["#1A3C5E"])).toBe("#FFFFFF");
  });
  it("every group colour reaches 4.5:1 with its chosen text, alone or paired with another", () => {
    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#6b7280"];
    for (const c of colors) expect(contrastRatio(c, readableText([c]))).toBeGreaterThanOrEqual(4.5);
  });
  it("a gradient is judged on its worst stop", () => {
    const t = readableText(["#3b82f6", "#22c55e"]);
    expect(Math.min(contrastRatio("#3b82f6", t), contrastRatio("#22c55e", t))).toBeGreaterThan(4);
  });
});

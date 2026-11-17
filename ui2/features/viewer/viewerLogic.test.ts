import { describe, expect, it } from "vitest";
import { clampPage, clampScale, fitWidthScale, loadErrorMessage, MAX_SCALE, MIN_SCALE, pageLabel, pagesToRender, stepScale } from "./viewerLogic";

describe("zoom", () => {
  it("keeps the zoom inside the range and treats junk as 1", () => {
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(NaN)).toBe(1);
    expect(clampScale(Infinity)).toBe(1);
  });
  it("fits a page to the width, within the range", () => {
    expect(fitWidthScale(600, 300)).toBe(0.5);
    expect(fitWidthScale(600, 900)).toBe(1.5);
    expect(fitWidthScale(100, 1000)).toBe(MAX_SCALE);
    expect(fitWidthScale(0, 500)).toBe(1);
    expect(fitWidthScale(600, 0)).toBe(1);
  });
  it("steps by a quarter and stops at the ends", () => {
    expect(stepScale(1, 1)).toBe(1.25);
    expect(stepScale(1, -1)).toBe(0.75);
    expect(stepScale(MAX_SCALE, 1)).toBe(MAX_SCALE);
    expect(stepScale(MIN_SCALE, -1)).toBe(MIN_SCALE);
  });
});

describe("pages", () => {
  it("clamps a requested page to 1..total and keeps the current page for non-numbers", () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(10);
    expect(clampPage(3.6, 10)).toBe(4);
    expect(clampPage(NaN, 10, 7)).toBe(7);
    expect(clampPage(5, 0, 2)).toBe(2);
  });
  it("labels the page counter", () => {
    expect(pageLabel(3, 120)).toBe("Page 3 of 120");
    expect(pageLabel(1, null)).toBe("Loading pages");
  });
  it("draws only the visible pages plus a margin, inside the file", () => {
    expect(pagesToRender([5, 6], 300)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(pagesToRender([1], 300)).toEqual([1, 2, 3]);
    expect(pagesToRender([299, 300], 300)).toEqual([297, 298, 299, 300]);
    expect(pagesToRender([], 300)).toEqual([]);
    expect(pagesToRender([1], 0)).toEqual([]);
  });
});

describe("load errors", () => {
  it("explains the common failures in plain words", () => {
    expect(loadErrorMessage({ name: "PasswordException" })).toMatch(/password/);
    expect(loadErrorMessage({ name: "InvalidPDFException" })).toMatch(/not a readable PDF/);
    expect(loadErrorMessage(new Error("Unexpected server response (401)"))).toMatch(/not signed in/);
    expect(loadErrorMessage(new Error("Missing PDF"))).toMatch(/could not be found/);
    expect(loadErrorMessage(new Error("network down"))).toMatch(/try again, or download/);
    expect(loadErrorMessage(undefined)).toMatch(/try again/);
  });
});

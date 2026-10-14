import test from "node:test";
import assert from "node:assert/strict";
import { isYearlyPaperId, mistakeBucket, yearlyPaperLabel } from "./paperLabel.mjs";

test("names a yearly paper by session, year and paper", () => {
  assert.equal(yearlyPaperLabel("9618_w24_22"), "Past paper Oct/Nov 2024, Paper 22");
  assert.equal(yearlyPaperLabel("0625_m26_42"), "Past paper Feb/Mar 2026, Paper 42");
  assert.equal(yearlyPaperLabel("0510_s16_21"), "Past paper May/Jun 2016, Paper 21");
  assert.equal(yearlyPaperLabel("9709_w01_1"), "Past paper Oct/Nov 2001, Paper 1");
});
test("a topical worksheet id is not a yearly paper", () => {
  assert.equal(yearlyPaperLabel("1Z-aYRcmB70ZiQWhLipoxvKcMEeMNAefk"), null);
  assert.equal(isYearlyPaperId("1Z-aYRcmB70ZiQWhLipoxvKcMEeMNAefk"), false);
  assert.equal(isYearlyPaperId("9618_w24_22"), true);
  assert.equal(yearlyPaperLabel(undefined), null);
});
test("a saved chapter always wins", () => assert.equal(mistakeBucket("2 Ions and ionic bonds", "9618_w24_22"), "2 Ions and ionic bonds"));
test("no chapter: a yearly paper by name, anything else says so plainly", () => {
  assert.equal(mistakeBucket(null, "9618_w24_22"), "Past paper Oct/Nov 2024, Paper 22");
  assert.equal(mistakeBucket("", "0620_m26_42"), "Past paper Feb/Mar 2026, Paper 42");
  assert.equal(mistakeBucket(null, "uploaded-paper"), "No chapter recorded");
  assert.equal(mistakeBucket(null, undefined), "No chapter recorded");
});

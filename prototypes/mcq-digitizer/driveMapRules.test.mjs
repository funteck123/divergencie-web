import test from "node:test";
import assert from "node:assert/strict";
import { A2_COMPONENT, AS_COMPONENT, aLevelTheoryComponent, chapterNumber, diffBuckets } from "./driveMapRules.mjs";

test("reads the chapter number from a worksheet name", () => {
  assert.equal(chapterNumber("CAIE A Level Physics Ch24 NMR (Theory) Worksheet 1 QP.pdf"), 24);
  assert.equal(chapterNumber("CAIE A Level Chemistry Ch1 Atomic Structure (Theory) Worksheet 2 QP.pdf"), 1);
  assert.equal(chapterNumber("CAIE A Level Biology Chapter Summary.pdf"), null);
});

test("Physics: chapters 1 to 11 are AS, 12 onwards A Level", () => {
  const f = (n) => aLevelTheoryComponent("Physics", `CAIE A Level Physics Ch${n} X (Theory) Worksheet 1 QP.pdf`);
  assert.equal(f(11), AS_COMPONENT);
  assert.equal(f(12), A2_COMPONENT);
});

test("Chemistry: chapters 1 to 22 are AS, 23 onwards A Level", () => {
  const f = (n) => aLevelTheoryComponent("Chemistry", `CAIE A Level Chemistry Ch${n} X (Theory) Worksheet 1 QP.pdf`);
  assert.equal(f(22), AS_COMPONENT);
  assert.equal(f(23), A2_COMPONENT);
  assert.equal(f(38), A2_COMPONENT);
});

test("Biology: chapters 1 to 11 are AS, 12 onwards A Level", () => {
  const f = (n) => aLevelTheoryComponent("Biology", `CAIE A Level Biology Ch${n} X (Theory) Worksheet 1 QP.pdf`);
  assert.equal(f(11), AS_COMPONENT);
  assert.equal(f(12), A2_COMPONENT);
});

test("no chapter number, or an unknown subject, stays in Paper 4", () => {
  assert.equal(aLevelTheoryComponent("Physics", "Notes.pdf"), A2_COMPONENT);
  assert.equal(aLevelTheoryComponent("Economics", "CAIE A Level Economics Ch1 X.pdf"), A2_COMPONENT);
});

test("diffBuckets counts files by id", () => {
  assert.deepEqual(diffBuckets([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }, { id: "d" }]), { added: 2, removed: 1 });
  assert.deepEqual(diffBuckets(undefined, [{ id: "x" }]), { added: 1, removed: 0 });
});

import { isBrokenSplit, pairBaseName } from "./driveMapRules.mjs";
test("a worksheet cut into no question, or one question against several answers, is a failed split", () => {
  const rec = (q, a) => ({ questions: Array(q).fill({}), answers: Array(a).fill({}) });
  assert.equal(isBrokenSplit(rec(0, 4)), true);
  assert.equal(isBrokenSplit(rec(1, 7)), true);
  assert.equal(isBrokenSplit(rec(1, 0)), true);
  assert.equal(isBrokenSplit(rec(1, 1)), false);
  assert.equal(isBrokenSplit(rec(3, 7)), false, "fewer questions than answer blocks is normal when marks are split into parts");
  assert.equal(isBrokenSplit(rec(5, 5)), false);
  assert.equal(isBrokenSplit(undefined), true);
});
test("a QP and its MS share a base name", () => {
  assert.equal(pairBaseName("CAIE A Level Maths Ch3.1 Algebra (P3) Worksheet 2 QP.pdf"), pairBaseName("CAIE A Level Maths Ch3.1 Algebra (P3) Worksheet 2 MS.pdf"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { cachedIdSet, cachedLibrary, isSafeId, liveFailed, markCached, mayOpenCached, savedPaperReply } from "./solverCacheCore.js";

const lib = { IGCSE: { Physics: { "Paper 2": [{ qpId: "AAAAAA1", title: "Ch1.1 WS1" }, { qpId: "BBBBBB2", title: "Ch1.2 WS1" }] } } };
const index = { papers: { AAAAAA1: { board: "IGCSE", subject: "Physics" } }, library: { IGCSE: { Physics: { "Paper 2": [{ qpId: "AAAAAA1", title: "Ch1.1 WS1", cached: true }] } } } };

test("only Drive-style ids are accepted for a storage path", () => {
  assert.equal(isSafeId("14XDKcQOkMsZCpH1YMv-bWYXyy9v6f_mO"), true);
  for (const bad of ["", "a/b", "../x", "abc", "x".repeat(101), "id with space", null, undefined, 42]) assert.equal(isSafeId(bad), false, String(bad));
});

test("a broken index gives an empty set, a good one lists its papers", () => {
  assert.equal(cachedIdSet(null).size, 0);
  assert.equal(cachedIdSet({}).size, 0);
  assert.deepEqual([...cachedIdSet(index)], ["AAAAAA1"]);
});

test("markCached flags only saved papers and leaves the input alone", () => {
  const before = JSON.stringify(lib);
  const out = markCached(lib, cachedIdSet(index));
  assert.equal(out.IGCSE.Physics["Paper 2"][0].cached, true);
  assert.equal(out.IGCSE.Physics["Paper 2"][1].cached, undefined);
  assert.equal(JSON.stringify(lib), before);
  assert.equal(markCached(lib, new Set()), lib);
  assert.equal(markCached(null, cachedIdSet(index)), null);
});

test("the saved library is the index's own library, or empty", () => {
  assert.equal(cachedLibrary(index).IGCSE.Physics["Paper 2"].length, 1);
  assert.deepEqual(cachedLibrary(null), {});
  assert.deepEqual(cachedLibrary({ library: "x" }), {});
});

test("enrolled subjects only, Management always", () => {
  const key = (b, s) => `${b} ${s}`.toLowerCase();
  const entry = { board: "IGCSE", subject: "Physics" };
  assert.equal(mayOpenCached(entry, null, key), true);
  assert.equal(mayOpenCached(entry, new Set(["igcse physics"]), key), true);
  assert.equal(mayOpenCached(entry, new Set(["igcse chemistry"]), key), false);
  assert.equal(mayOpenCached(undefined, null, key), false);
});

test("a saved paper reply carries the flag; an empty one is refused", () => {
  const r = savedPaperReply({ questions: [{ questionNumber: "1" }], ambiguousAnswerKey: [] });
  assert.equal(r.fromCache, true);
  assert.equal(r.questions.length, 1);
  assert.equal(savedPaperReply({ questions: [] }), null);
  assert.equal(savedPaperReply(null), null);
});

test("which live failures fall back to the saved copy", () => {
  assert.equal(liveFailed({ threw: true }), true);
  assert.equal(liveFailed({ threw: false, status: 200, jsonOk: false }), true);
  assert.equal(liveFailed({ threw: false, status: 502, jsonOk: true }), true);
  assert.equal(liveFailed({ threw: false, status: 503, jsonOk: true }), true);
  assert.equal(liveFailed({ threw: false, status: 200, jsonOk: true }), false);
  assert.equal(liveFailed({ threw: false, status: 404, jsonOk: true }), false);
  assert.equal(liveFailed({ threw: false, status: 400, jsonOk: true }), false);
});

test("mayOpenCached: an AS student does not open an A2 paper, an A2 student opens both, an older A-Level service opens all", async () => {
  const { boardKeyOf, levelsFor } = await import("./solverLevels.js");
  const key = (b, s) => `${boardKeyOf(b)} ${String(s).toLowerCase()}`;
  const as = new Map([["a levels computer science", levelsFor("AS Level")]]);
  const a2 = new Map([["a levels computer science", levelsFor("A2 Level")]]);
  const old = new Map([["a levels computer science", levelsFor("A-Level")]]);
  const p1 = { board: "A Levels", subject: "Computer Science", component: "Paper 1: Theory Fundamentals (AS Level)" };
  const p3 = { board: "A Levels", subject: "Computer Science", component: "Paper 3: Advanced Theory (A Level)" };
  assert.equal(mayOpenCached(p1, as, key), true);
  assert.equal(mayOpenCached(p3, as, key), false);
  assert.equal(mayOpenCached(p3, a2, key), true);
  assert.equal(mayOpenCached(p1, a2, key), true);
  assert.equal(mayOpenCached(p3, old, key), true);
  assert.equal(mayOpenCached(p3, new Set(["a levels computer science"]), key), true);
});

test("mayOpenCached: Physics Paper 3 (a practical) opens for an AS student, Paper 4 does not", async () => {
  const { boardKeyOf, levelsFor } = await import("./solverLevels.js");
  const key = (b, s) => `${boardKeyOf(b)} ${String(s).toLowerCase()}`;
  const as = new Map([["a levels physics", levelsFor("AS Level")]]);
  assert.equal(mayOpenCached({ board: "A Levels", subject: "Physics", component: "Paper 3: Advanced Practical Skills (A Level)" }, as, key), true);
  assert.equal(mayOpenCached({ board: "A Levels", subject: "Physics", component: "Paper 4: A Level Structured Questions (A Level)" }, as, key), false);
});

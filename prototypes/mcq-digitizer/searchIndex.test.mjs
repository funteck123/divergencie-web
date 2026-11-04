import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search, tokenize } from "./searchIndex.mjs";

const docs = [
  { id: "a", text: "Calculate the upper bound for the area of the square. The sides are 8 cm correct to the nearest centimetre." },
  { id: "b", text: "Find the coefﬁcient of x5 in the expansion of (2 + x)(1 - x)6." },
  { id: "c", text: "Explain why the lower bound of a rectangle's perimeter changes." },
  { id: "d", text: "" },
  { id: "e", text: "Diffusion is the net movement of particles from a region of higher concentration to lower concentration." },
];
const index = buildIndex(docs);
const ids = (q, o) => search(index, q, o).results.map((r) => r.id);

test("tokenize folds ligatures and drops symbols", () => {
  assert.deepEqual(tokenize("coefﬁcient of x5 = 9.5 £"), ["coefficient", "of", "x5", "9.5"]);
  assert.deepEqual(tokenize(null), []);
});
test("an empty text is not indexed", () => assert.equal(index.docs.length, 4));
test("every word must be present", () => {
  assert.deepEqual(ids("upper bound area"), ["a"]);
  assert.deepEqual(ids("bound"), ["a", "c"].sort((x, y) => ids("bound").indexOf(x) - ids("bound").indexOf(y)));
  assert.deepEqual(ids("upper bound diffusion"), []);
});
test("a ligature in the PDF is found by plain letters", () => assert.deepEqual(ids("coefficient"), ["b"]));
test("the last word may be a prefix, earlier words may not", () => {
  assert.deepEqual(ids("diffus"), ["e"]);
  assert.deepEqual(ids("diffus particles"), []);
  assert.deepEqual(ids("particles diffus"), ["e"]);
});
test("small words are ignored when other words exist, and search when alone", () => {
  assert.deepEqual(ids("the area of the"), ["a"]);
  assert.ok(ids("of").length > 0);
});
test("exact phrase ranks above scattered words", () => {
  const i2 = buildIndex([{ id: "scattered", text: "lower the concentration then bound it" }, { id: "phrase", text: "the lower bound is needed" }]);
  assert.equal(search(i2, "lower bound").results[0].id, "phrase");
});
test("snippet is centred on a match and carries no extra fields", () => {
  const r = search(index, "perimeter").results[0];
  assert.equal(r.id, "c");
  assert.match(r.snippet, /perimeter/);
  assert.equal("text" in r, false);
  assert.equal("lower" in r, false);
});
test("limit, total and filter", () => {
  assert.equal(search(index, "the", { limit: 1 }).results.length, 1);
  assert.ok(search(index, "the", { limit: 1 }).total >= 2);
  assert.deepEqual(ids("bound", { filter: (d) => d.id === "c" }), ["c"]);
});
test("a query with no words or no match returns nothing", () => {
  assert.deepEqual(search(index, "").results, []);
  assert.deepEqual(search(index, "£ ∑ ?").results, []);
  assert.deepEqual(search(index, "zzzzqq").results, []);
});
test("the title is searched but never shown or returned", () => {
  const i3 = buildIndex([{ id: "q1", text: "Find the coefficient of x8.", also: "Binomial Expansion Worksheet 2" }]);
  const r = search(i3, "binomial coefficient x8").results[0];
  assert.equal(r.id, "q1");
  assert.doesNotMatch(r.snippet, /Binomial/);
  assert.equal("also" in r || "alsoLower" in r, false);
});

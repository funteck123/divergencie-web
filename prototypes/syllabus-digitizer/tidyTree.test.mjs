import test from "node:test";
import assert from "node:assert/strict";
import { tidyTree } from "./tidyTree.mjs";

const n = (code, title) => ({ code, title, depth: 0, children: [] });

test("9618: drops wrappers and the teacher guidance tail, keeps chapters in order", () => {
  const out = tidyTree({ code: "9618", tree: [n("3", "Subject content"), n("1", "Information representation"), n("12", "Software Development"), n(null, "A Level content"), n("13", "Data Representation"), n("20", "Further Programming"), n(null, "Teacher guidance"), n(null, "Faculty feedback: x")] });
  assert.deepEqual(out.tree.map((x) => x.title), ["Information representation", "Software Development", "Data Representation", "Further Programming"]);
});

test("other subjects keep their uncoded sections, only the feedback testimonial goes", () => {
  const out = tidyTree({ code: "9701", tree: [n(null, "AS Level subject content"), n("1", "Atomic structure"), n(null, "Feedback from: Dr X")] });
  assert.deepEqual(out.tree.map((x) => x.title), ["AS Level subject content", "Atomic structure"]);
});

test("no tree: returned unchanged", () => {
  const s = { error: "x" };
  assert.equal(tidyTree(s), s);
});

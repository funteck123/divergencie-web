import test from "node:test";
import assert from "node:assert/strict";
import { DC_PAPERS, DC_COMPONENT, isDcId, loadDcPaper, withDcLibrary } from "./index.js";

test("the component is added next to the Cambridge papers, only where IGCSE Mathematics exists", () => {
  const lib = { IGCSE: { Mathematics: { "Paper 2: Non-calculator (Extended)": [{ title: "x", qpId: "q", msId: "m" }] }, Physics: {} } };
  const out = withDcLibrary(lib);
  assert.deepEqual(Object.keys(out.IGCSE.Mathematics), ["Paper 2: Non-calculator (Extended)", DC_COMPONENT]);
  assert.equal(out.IGCSE.Mathematics[DC_COMPONENT].length, 3);
  assert.equal(out.IGCSE.Mathematics[DC_COMPONENT][0].qpId, "dc-alg-cs-e");
  assert.equal(lib.IGCSE.Mathematics[DC_COMPONENT], undefined, "the input library is not changed");
  const noMaths = { IGCSE: { Physics: {} } };
  assert.equal(withDcLibrary(noMaths), noMaths, "a student without IGCSE Mathematics gets nothing added");
});

test("each paper has 30 questions with a lettered answer, a picture, and the planned marks", async () => {
  const planned = { "dc-alg-cs-e": 50, "dc-alg-cs-m": 80, "dc-alg-cs-d": 121 };
  for (const p of DC_PAPERS) {
    assert.ok(isDcId(p.id));
    const paper = await loadDcPaper(p.id);
    assert.equal(paper.questions.length, 30, p.id);
    for (const q of paper.questions) {
      assert.deepEqual(q.optionLetters, ["A", "B", "C", "D"]);
      assert.match(q.correctAnswer, /^[ABCD]$/);
      assert.match(q.image, /^data:image\/png;base64,/);
      assert.match(q.solutionImage, /^data:image\/png;base64,/, "every question carries its worked solution");
    }
    assert.deepEqual(paper.questions.map((q) => q.questionNumber), Array.from({ length: 30 }, (_, i) => String(i + 1)));
    assert.equal(paper.questions.reduce((s, q) => s + q.marks, 0), planned[p.id], `${p.id} marks`);
  }
});

test("an unknown id gives nothing", async () => {
  assert.equal(await loadDcPaper("dc-nope"), null);
  assert.equal(isDcId("1OvFB5uZRZlah9Dg3AzrTxNRQS3UG35sf"), false);
});

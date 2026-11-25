import { describe, expect, it } from "vitest";
import { buildCheckBody, initialEdits, latestCheck, selfRows, totalsOf } from "./teacherCheckLogic";
import type { QuestionResponse } from "./solverTypes";

const resp = (q: string, a: number | null, o: number | null, remark: string | undefined, answer = "my working"): QuestionResponse => ({ question_number: q, marks_awarded: a, marks_available: o, remark, student_answer: answer });

describe("selfRows", () => {
  const rows = selfRows([
    resp("10", 3, 4, "Self-marked by the student. Note: forgot the unit"),
    resp("2", 1, 2, "Self-marked by the student."),
    resp("1", 2, 3, "Close."),                                    // an AI mark is not part of a self-marked paper
    resp("3", 4, 4, "Teacher check by Atiqa: agrees with the student's marks."),
  ]);
  it("keeps only the student's own marked answers, in paper order, with their note", () => {
    expect(rows.map((r) => r.q)).toEqual(["2", "10"]);
    expect(rows[1]).toEqual({ q: "10", answer: "my working", awarded: 3, available: 4, note: "forgot the unit" });
    expect(rows[0]?.note).toBe("");
  });
  it("totals", () => expect(totalsOf(rows)).toEqual({ awarded: 4, available: 6 }));
  it("the boxes start on the student's marks", () => expect(initialEdits(rows)["10"]).toEqual({ awarded: "3", outOf: "4", comment: "" }));
});

describe("latestCheck", () => {
  it("is null before any check", () => expect(latestCheck([resp("1", 1, 2, "Self-marked by the student.")])).toBeNull());
  it("takes the newest row for each question and the teacher's name", () => {
    const c = latestCheck([
      resp("1", 1, 3, "Teacher check by Atiqa: changed the marks from 2/3 to 1/3."),
      resp("2", 4, 4, "Teacher check by Atiqa: agrees with the student's marks."),
      resp("1", 3, 3, "Teacher check by Khadija: changed the marks from 2/3 to 3/3. unit was given"),
    ]);
    expect(c?.by).toBe("Khadija");
    expect(c?.marks["1"]).toMatchObject({ awarded: 3, available: 3 });
    expect(c?.marks["2"]).toMatchObject({ awarded: 4, available: 4 });
  });
});

describe("buildCheckBody", () => {
  const rows = selfRows([resp("1", 2, 3, "Self-marked by the student."), resp("2", 4, 4, "Self-marked by the student.")]);
  it("agree with everything in one go", () => {
    const r = buildCheckBody("A1", rows, initialEdits(rows));
    expect(r).toEqual({ ok: true, body: { attemptId: "A1", rows: [{ questionNumber: "1", marksAwarded: 2, marksAvailable: 3, comment: "" }, { questionNumber: "2", marksAwarded: 4, marksAvailable: 4, comment: "" }] } });
  });
  it("a changed mark and a comment go through, trimmed", () => {
    const e = { ...initialEdits(rows), "1": { awarded: "3", outOf: "3", comment: "  unit was given " } };
    const r = buildCheckBody("A1", rows, e);
    expect(r.ok && r.body.rows[0]).toEqual({ questionNumber: "1", marksAwarded: 3, marksAvailable: 3, comment: "unit was given" });
  });
  it("names the question with a bad mark and refuses", () => {
    const r = buildCheckBody("A1", rows, { ...initialEdits(rows), "2": { awarded: "9", outOf: "4", comment: "" } });
    expect(r).toEqual({ ok: false, message: "Question 2: You cannot give more marks than the question is worth." });
  });
  it("a question with both boxes empty is left out; nothing marked is refused", () => {
    const e = { ...initialEdits(rows), "2": { awarded: "", outOf: "", comment: "" } };
    const r = buildCheckBody("A1", rows, e);
    expect(r.ok && r.body.rows.map((x) => x.questionNumber)).toEqual(["1"]);
    expect(buildCheckBody("A1", rows, { "1": { awarded: "", outOf: "", comment: "" }, "2": { awarded: "", outOf: "", comment: "" } })).toEqual({ ok: false, message: "Mark at least one question." });
  });
});

import { describe, expect, it } from "vitest";
import { checkSelfMark, selfMarkRemark, selfMarkTotals } from "./selfMarkLogic";
import { initialQuiz, quizReducer, type QuizAction } from "./quizMachine";

const m = (awarded: string, outOf: string, note = "") => ({ awarded, outOf, note });

describe("checkSelfMark", () => {
  it("empty rows are left out", () => expect(checkSelfMark(undefined)).toEqual({ state: "empty" }));
  it("accepts whole marks and trims the note", () => expect(checkSelfMark(m(" 3", "4 ", "  missed units "))).toEqual({ state: "ok", awarded: 3, outOf: 4, note: "missed units" }));
  it("refuses more than the question is worth, decimals, text, and one box without the other", () => {
    expect(checkSelfMark(m("5", "4")).state).toBe("invalid");
    expect(checkSelfMark(m("2.5", "4")).state).toBe("invalid");
    expect(checkSelfMark(m("two", "4")).state).toBe("invalid");
    expect(checkSelfMark(m("2", "")).state).toBe("invalid");
    expect(checkSelfMark(m("", "4")).state).toBe("invalid");
    expect(checkSelfMark(m("0", "0")).state).toBe("invalid");
  });
  it("zero marks is a real mark", () => expect(checkSelfMark(m("0", "3")).state).toBe("ok"));
});

describe("selfMarkTotals", () => {
  it("adds only the marked questions and counts full marks", () => {
    const t = selfMarkTotals(["1", "2", "3", "4"], { "1": m("3", "3"), "2": m("1", "4"), "3": m("9", "4") });
    expect(t).toEqual({ awarded: 4, outOf: 7, marked: 2, invalid: 1, fullMarks: 1 });
  });
});

describe("selfMarkRemark", () => {
  it("marks the answer as self-marked, with the note when there is one", () => {
    expect(selfMarkRemark("")).toBe("Self-marked by the student.");
    expect(selfMarkRemark(" careless ")).toBe("Self-marked by the student. Note: careless");
  });
});

describe("ending a written test", () => {
  const run = (actions: QuizAction[]) => actions.reduce(quizReducer, initialQuiz);
  const base: QuizAction[] = [{ type: "load", kind: "structured", order: ["1", "2"] }, { type: "start", mode: "test" }, { type: "text", q: "1", text: "my answer" }];
  it("end stops the clock and keeps the answers", () => {
    const s = run([...base, { type: "tick" }, { type: "end" }, { type: "tick" }]);
    expect(s.phase).toBe("ended");
    expect(s.elapsed).toBe(1);
    expect(s.texts).toEqual({ "1": "my answer" });
  });
  it("answers are locked once ended, and the student can go back to the exam", () => {
    const ended = run([...base, { type: "end" }, { type: "text", q: "1", text: "changed" }]);
    expect(ended.texts["1"]).toBe("my answer");
    expect(run([...base, { type: "end" }, { type: "reopen" }]).phase).toBe("paused");
  });
  it("only a written test can be ended", () => {
    expect(run([{ type: "load", kind: "mcq", order: ["1"] }, { type: "start", mode: "test" }, { type: "end" }]).phase).toBe("running");
    expect(run([{ type: "load", kind: "structured", order: ["1"] }, { type: "start", mode: "practice" }, { type: "end" }]).phase).toBe("running");
  });
  it("marks are typed only while ended, for known questions", () => {
    expect(run([...base, { type: "selfMark", q: "1", field: "awarded", value: "2" }]).selfMarks).toEqual({});
    const s = run([...base, { type: "end" }, { type: "selfMark", q: "1", field: "awarded", value: "2" }, { type: "selfMark", q: "1", field: "outOf", value: "3" }, { type: "selfMark", q: "99", field: "awarded", value: "1" }]);
    expect(s.selfMarks).toEqual({ "1": { awarded: "2", outOf: "3", note: "" } });
  });
  it("an ended test can be submitted for AI grading", () => expect(run([...base, { type: "end" }, { type: "submit" }]).phase).toBe("submitted"));
  it("restore brings back the typed marks", () => {
    const s = run([...base, { type: "restore", elapsed: 90, texts: { "1": "saved" }, selfMarks: { "1": m("1", "2", "n") } }, { type: "end" }]);
    expect(s.selfMarks["1"]).toEqual(m("1", "2", "n"));
    expect(s.elapsed).toBe(90);
  });
});

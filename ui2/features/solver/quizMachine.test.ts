import { describe, expect, it } from "vitest";
import { initialQuiz, needsCancelConfirm, quizReducer, unansweredQuestions, type QuizAction, type QuizState } from "./quizMachine";

const run = (actions: QuizAction[], from: QuizState = initialQuiz) => actions.reduce(quizReducer, from);
const loaded = (kind: "mcq" | "structured" = "mcq") => run([{ type: "load", kind, order: ["1", "2", "3"] }]);
const testing = () => run([{ type: "start", mode: "test" }], loaded());

describe("phases", () => {
  it("load makes the paper ready, start runs it", () => {
    expect(loaded().phase).toBe("ready");
    expect(testing().phase).toBe("running");
  });
  it("cannot start without a loaded paper", () => expect(run([{ type: "start", mode: "test" }]).phase).toBe("idle"));
  it("pause and resume only move between running and paused", () => {
    expect(run([{ type: "pause" }], loaded()).phase).toBe("ready");
    expect(run([{ type: "pause" }], testing()).phase).toBe("paused");
    expect(run([{ type: "pause" }, { type: "resume" }], testing()).phase).toBe("running");
  });
  it("submit stops the quiz and cannot be repeated or undone", () => {
    const done = run([{ type: "submit" }], testing());
    expect(done.phase).toBe("submitted");
    expect(run([{ type: "answer", q: "1", letter: "A" }, { type: "tick" }, { type: "resume" }], done)).toEqual(done);
    expect(run([{ type: "review" }], done).phase).toBe("reviewing");
  });
  it("practice has no submit, only done practicing", () => {
    const p = run([{ type: "start", mode: "practice" }], loaded());
    expect(run([{ type: "submit" }], p).phase).toBe("running");
    expect(run([{ type: "finishPractice" }], p).phase).toBe("idle");
    expect(run([{ type: "finishPractice" }], testing()).phase).toBe("running");
  });
});

describe("timer", () => {
  it("advances only while running", () => {
    const s = run([{ type: "tick" }, { type: "tick" }], testing());
    expect(s.elapsed).toBe(2);
    expect(run([{ type: "pause" }, { type: "tick" }], s).elapsed).toBe(2);
    expect(run([{ type: "tick" }], loaded()).elapsed).toBe(0);
  });
});

describe("answers and flags", () => {
  it("an answer can change until submit, also while paused", () => {
    const s = run([{ type: "answer", q: "1", letter: "A" }, { type: "pause" }, { type: "answer", q: "1", letter: "C" }], testing());
    expect(s.answers).toEqual({ "1": "C" });
  });
  it("unknown questions and practice mode record nothing", () => {
    expect(run([{ type: "answer", q: "99", letter: "A" }], testing()).answers).toEqual({});
    expect(run([{ type: "answer", q: "1", letter: "A" }], run([{ type: "start", mode: "practice" }], loaded())).answers).toEqual({});
  });
  it("flag toggles, test and mistakes only", () => {
    const s = run([{ type: "flag", q: "2" }], testing());
    expect(s.flags).toEqual(["2"]);
    expect(run([{ type: "flag", q: "2" }], s).flags).toEqual([]);
    expect(run([{ type: "flag", q: "2" }], run([{ type: "start", mode: "practice" }], loaded())).flags).toEqual([]);
    expect(run([{ type: "flag", q: "2" }], run([{ type: "start", mode: "mistakes" }], loaded())).flags).toEqual(["2"]);
  });
  it("clearing an answer", () => expect(run([{ type: "answer", q: "1", letter: "A" }, { type: "clearAnswer", q: "1" }], testing()).answers).toEqual({}));
  it("structured text is kept in test mode", () => {
    const s = run([{ type: "start", mode: "test" }, { type: "text", q: "1", text: "x = 4" }], loaded("structured"));
    expect(s.texts).toEqual({ "1": "x = 4" });
    expect(run([{ type: "answer", q: "1", letter: "A" }], s).answers).toEqual({});
  });
  it("unanswered list", () => expect(unansweredQuestions(run([{ type: "answer", q: "2", letter: "B" }], testing()))).toEqual(["1", "3"]));
});

describe("navigation", () => {
  it("next, prev and goto stay inside the paper", () => {
    const s = testing();
    expect(run([{ type: "prev" }], s).index).toBe(0);
    expect(run([{ type: "next" }, { type: "next" }, { type: "next" }], s).index).toBe(2);
    expect(run([{ type: "goto", index: 1 }], s).index).toBe(1);
    expect(run([{ type: "goto", index: 9 }], s).index).toBe(0);
  });
});

describe("cancel and resume", () => {
  it("cancel throws everything away but keeps the instant check choice", () => {
    const s = run([{ type: "instantCheck", on: true }, { type: "answer", q: "1", letter: "A" }, { type: "cancel" }], testing());
    expect(s).toEqual({ ...initialQuiz, instantCheck: true });
  });
  it("confirm is needed for test and mistakes while live, never for practice or when finished", () => {
    expect(needsCancelConfirm(testing())).toBe(true);
    expect(needsCancelConfirm(run([{ type: "start", mode: "practice" }], loaded()))).toBe(false);
    expect(needsCancelConfirm(run([{ type: "submit" }], testing()))).toBe(false);
  });
  it("restore brings back answers, flags, texts and the clock", () => {
    const s = run([{ type: "restore", elapsed: 90, answers: { "1": "B" }, flags: ["3"], texts: { "2": "t" } }], testing());
    expect([s.elapsed, s.answers, s.flags, s.texts]).toEqual([90, { "1": "B" }, ["3"], { "2": "t" }]);
  });
  it("a second load starts clean", () => expect(run([{ type: "load", kind: "mcq", order: ["9"] }], run([{ type: "answer", q: "1", letter: "A" }], testing())).answers).toEqual({}));
});

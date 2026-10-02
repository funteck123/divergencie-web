import { describe, expect, it } from "vitest";
import { AUTOSAVE_MAX_AGE_MS, chapterKey, chapterLabel, chapterNameOf, chapterNames, chapterOf, comparePapers, componentsOf, fetchButtonLabel, formatTimer, gradeMcq, historyRows, isFullMarks, isReadingComponent, isStructuredComponent, mistakeResults, naturalQuestionSort, paperTypes, pctOf, resumable, scoreStructured, seriesByAccount, titleIndex, type AutosaveRecord } from "./solverLogic";
import type { AttemptRow, Library, McqQuestion, YearlyLibrary } from "./solverTypes";

describe("titles", () => {
  it("chapter number from the two title styles", () => { expect(chapterOf("Ch3 Atoms (MCQ) Worksheet 2")).toBe("3"); expect(chapterOf("2.1-structure-_ial")).toBe("2.1"); expect(chapterOf("Mock")).toBeNull(); });
  it("chapter name from the three patterns", () => {
    expect(chapterNameOf("Ch3 Atomic structure (MCQ) Worksheet 2")).toBe("Atomic structure");
    expect(chapterNameOf("1-atomic_structure-_ial-cie-chemistry")).toBe("Atomic Structure");
    expect(chapterNameOf("Ch4 Bonding (Paper 2) Worksheet 1")).toBe("Bonding");
  });
  it("chapter key", () => { expect(chapterKey("Ch3 Atomic structure (MCQ)")).toBe("3 Atomic structure"); expect(chapterKey("Ch3 Notes")).toBe("3"); });
  it("papers sort by chapter then worksheet then title, unknown chapters last", () => {
    const ps = [{ qpId: "c", title: "Misc" }, { qpId: "b", title: "Ch2 B (MCQ) Worksheet 1" }, { qpId: "a2", title: "Ch1 A (MCQ) Worksheet 2" }, { qpId: "a1", title: "Ch1 A (MCQ) Worksheet 1" }];
    expect([...ps].sort(comparePapers).map((p) => p.qpId)).toEqual(["a1", "a2", "b", "c"]);
  });
  it("question numbers sort naturally", () => expect(["10", "2", "1b", "1a"].sort(naturalQuestionSort)).toEqual(["1a", "1b", "2", "10"]));
  it("timer", () => expect(formatTimer(125)).toBe("02:05"));
  it("labels use the chapter name when one is known", () => {
    const lib: Library = { Cambridge: { Chem: { "P1": [{ qpId: "x", title: "Ch3 Atomic structure (MCQ) Worksheet 1" }] } } };
    const names = chapterNames(lib);
    expect(chapterLabel(names, "Cambridge Chem", "3")).toBe("3 Atomic structure");
    expect(chapterLabel(names, "Cambridge Chem", "3 Atomic structure")).toBe("3 Atomic structure");
    expect(chapterLabel(names, "x", null)).toBe("—");
  });
});

describe("picker", () => {
  const lib: Library = { B: { S: { P1: [{ qpId: "q", title: "t" }], Empty: [] } } };
  const yearly: YearlyLibrary = { B: { S: { P1: [{ paperId: "y1", year: 2024, session: "May", variant: "11", title: "Y" }], "Examiner Report": [{ paperId: "e", year: 2024, session: "May", title: "E" }] } } };
  it("components: with worksheets first, then yearly only, empty ones dropped", () => expect(componentsOf(lib, yearly, "B", "S")).toEqual(["P1", "Examiner Report"]));
  it("paper type row only when both kinds exist", () => {
    expect(paperTypes([1], [1]).show).toBe(true);
    expect(paperTypes([], [1])).toMatchObject({ show: false, value: "yearly" });
    expect(paperTypes([1], [])).toMatchObject({ show: false, value: "topical" });
  });
  it("structured means not the subject's MCQ component", () => { expect(isStructuredComponent({ B: { S: { mcqComponent: "P1" } } }, "B", "S", "P2")).toBe(true); expect(isStructuredComponent({ B: { S: { mcqComponent: "P1" } } }, "B", "S", "P1")).toBe(false); expect(isStructuredComponent({}, "B", "S", "P1")).toBe(false); });
  it("reading components and button label", () => { expect(isReadingComponent("ZNotes: Physics")).toBe(true); expect(isReadingComponent("P1")).toBe(false); expect(fetchButtonLabel("Examiner Report")).toBe("View examiner report"); expect(fetchButtonLabel("P1")).toBe("Fetch this paper and start"); });
  it("title index merges worksheets, yearly and the account's own", () => expect(titleIndex(lib, yearly, { z: "Z", q: "ignored" })).toEqual({ q: "t", y1: "Y", e: "E", z: "Z" }));
});

describe("grading", () => {
  const q = (n: string, correct?: string): McqQuestion => ({ questionNumber: n, image: "i", optionLetters: ["A", "B"], correctAnswer: correct });
  it("verdicts", () => {
    const g = gradeMcq([q("1", "A"), q("2", "B"), q("3", "A"), q("4")], { "1": "A", "2": "A" }, new Set(["2"]));
    expect(g.results.map((r) => r.verdict)).toEqual(["correct", "incorrect", "unanswered", "unmatched"]);
    expect([g.correct, g.gradable, g.attemptedGradable]).toEqual([1, 3, 2]);
    expect(g.results[1]!.flagged).toBe(true);
  });
  it("structured: full marks only, ungradable left out", () => {
    const s = scoreStructured([{ questionNumber: "1", marksAwarded: 3, marksAvailable: 3 }, { questionNumber: "2", marksAwarded: 2, marksAvailable: 3 }, { questionNumber: "3", ungradable: true, marksAwarded: 0, marksAvailable: 0 }]);
    expect([s.gradable.length, s.correct]).toEqual([2, 1]);
    expect(isFullMarks({ questionNumber: "x", marksAwarded: 0, marksAvailable: 0 })).toBe(false);
  });
  it("mistakes body keeps only answered questions and structured detail when present", () => {
    const out = mistakeResults([{ questionNumber: "1", verdict: "correct" }, { questionNumber: "2", verdict: "unanswered" }, { questionNumber: "3", verdict: "incorrect", studentAnswer: "x", marksAwarded: 1, marksAvailable: 3 }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ questionNumber: "1", correct: true });
    expect(out[1]).toMatchObject({ questionNumber: "3", correct: false, studentAnswer: "x", marksAvailable: 3 });
  });
});

describe("progress", () => {
  const a = (o: Partial<AttemptRow>): AttemptRow => ({ account_id: "me", subject: "S", chapter: "1", paper_id: "p", mode: "test", score: 5, total_questions: 10, time_taken_seconds: 125, ...o });
  it("percent", () => { expect(pctOf(a({}))).toBe(50); expect(pctOf(a({ total_questions: 0 }))).toBe(0); });
  it("series split mine from others and drop practice and other scopes", () => {
    const s = seriesByAccount([a({}), a({ account_id: "o1" }), a({ mode: "practice", score: null }), a({ subject: "T" })], { subject: "S", chapter: "" }, "me");
    expect(s.mine).toHaveLength(1);
    expect(Object.keys(s.others)).toEqual(["o1"]);
  });
  it("history rows newest first with practice dashes", () => {
    const rows = historyRows([a({ id: "1", submitted_at: "2026-10-01T10:00:00Z" }), a({ id: "2", mode: "practice", score: null })], (_s, c) => `Ch ${c}`);
    expect(rows[0]).toMatchObject({ mode: "Practice", score: "—", canView: false });
    expect(rows[1]).toMatchObject({ mode: "Test", score: "5 / 10", percent: "50%", time: "02:05", chapter: "Ch 1", canView: true });
  });
});

describe("autosave", () => {
  const rec: AutosaveRecord = { v: 1, acct: "A", kind: "mcq", paperKey: "p1", savedAt: 1_000_000, elapsed: 30, answers: { "1": "A" } };
  const meta = { subject: "S", chapter: null, paperId: "p1" };
  it("offered for the same account, kind and paper within a day", () => expect(resumable(rec, "mcq", "A", meta, 1_000_000 + 1000)).toBe(true));
  it("not for another account, kind, paper or after a day", () => {
    expect(resumable(rec, "mcq", "B", meta, 1_001_000)).toBe(false);
    expect(resumable(rec, "structured", "A", meta, 1_001_000)).toBe(false);
    expect(resumable(rec, "mcq", "A", { ...meta, paperId: "p2" }, 1_001_000)).toBe(false);
    expect(resumable(rec, "mcq", "A", meta, 1_000_000 + AUTOSAVE_MAX_AGE_MS + 1)).toBe(false);
    expect(resumable(null, "mcq", "A", meta)).toBe(false);
    expect(resumable(rec, "mcq", "A", null, 1_001_000)).toBe(false);
  });
});

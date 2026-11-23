import { describe, expect, it } from "vitest";
import { imageBox, AUTOSAVE_MAX_AGE_MS, paperTypeChoices, subjectHasTypes, topicalChapters, pickerChapterOf, ELECTRICITY_GROUP, pdfFileName, yearlyPaperName, chapterKey, chapterLabel, chapterNameOf, chapterNames, chapterOf, comparePapers, componentsOf, fetchButtonLabel, formatTimer, gradeMcq, historyRows, hitToPick, searchQueryOf, isFullMarks, isReadingComponent, isStructuredComponent, mistakeResults, naturalQuestionSort, pctOf, resumable, scoreStructured, seriesByAccount, titleIndex, type AutosaveRecord } from "./solverLogic";
import type { SearchHit, AttemptRow, Library, McqQuestion, SolvedLibrary, YearlyLibrary } from "./solverTypes";

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
  it("paper type row only when the subject has more than one kind, starting on a kind the component has", () => {
    const both = { topical: true, yearly: true, solved: false }, none = { topical: false, yearly: false, solved: false };
    expect(paperTypeChoices({ topical: 1, yearly: 1, solved: 0 }, both)).toMatchObject({ show: true, value: "topical", options: ["topical", "yearly"] });
    expect(paperTypeChoices({ topical: 0, yearly: 1, solved: 0 }, both)).toMatchObject({ show: true, value: "yearly" });
    expect(paperTypeChoices({ topical: 1, yearly: 0, solved: 0 }, { topical: true, yearly: false, solved: false })).toMatchObject({ show: false, value: "topical" });
    expect(paperTypeChoices({ topical: 0, yearly: 0, solved: 0 }, none)).toMatchObject({ show: false, options: ["topical"] });
  });
  it("a component with no topical worksheets opens on its solved papers (TKT-0379)", () => {
    const all = { topical: true, yearly: true, solved: true };
    expect(paperTypeChoices({ topical: 0, yearly: 0, solved: 3 }, all)).toMatchObject({ show: true, value: "solved", options: ["topical", "yearly", "solved"] });
    expect(paperTypeChoices({ topical: 0, yearly: 2, solved: 3 }, all).value).toBe("yearly");
    expect(paperTypeChoices({ topical: 0, yearly: 0, solved: 0 }, all).value).toBe("topical"); // nothing here: the first kind, and the empty note says what else exists
  });
  it("components also list those that only have solved papers, last", () => {
    const solved: SolvedLibrary = { B: { S: { "Practical": [{ solvedId: "s", title: "T", kind: "Guide", pages: 3 }], P1: [{ solvedId: "p", title: "T", kind: "Guide", pages: 3 }] } } };
    expect(componentsOf(lib, yearly, "B", "S", solved)).toEqual(["P1", "Examiner Report", "Practical"]);
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

describe("picker helpers (TKT-0336, TKT-0337)", () => {
  const papers = [
    { qpId: "a", title: "CAIE A Level Maths Ch1.2 Functions (P1) Worksheet 2" }, { qpId: "b", title: "CAIE A Level Maths Ch1.1 Quadratics (P1) Worksheet 1" },
    { qpId: "c", title: "CAIE A Level Maths Ch1.2 Functions (P1) Worksheet 1" }, { qpId: "d", title: "Mixed revision" },
  ];
  it("lists each chapter once, in chapter order, with a count", () => {
    expect(topicalChapters(papers)).toEqual([
      { key: "1.1", label: "Ch 1.1: Quadratics", count: 1 }, { key: "1.2", label: "Ch 1.2: Functions", count: 2 }, { key: "~", label: "Other worksheets", count: 1 },
    ]);
  });
  // TKT-0416: IGCSE Physics numbers Electric Circuits and Digital Electronics both Ch4.3; the student sees one chapter, Electricity.
  const physics = [
    "CAIE IGCSE Physics Ch4.1 Simple Phenomena of Magnetism (Theory) Worksheet 1", "CAIE IGCSE Physics Ch4.2 Electrical Quantities (Theory) Worksheet 1",
    "CAIE IGCSE Physics Ch4.3 Electric Circuits (Theory) Worksheet 1", "CAIE IGCSE Physics Ch4.3 Digital Electronics (Theory) Worksheet 1",
    "CAIE IGCSE Physics Ch4.4 Dangers of Electricity (MCQ) Worksheet 1", "CAIE IGCSE Physics Ch4.5 Electromagnetic Effects (Theory) Worksheet 1",
  ].map((title, i) => ({ qpId: `p${i}`, title }));
  it("puts the electricity sections of IGCSE Physics (4.2, 4.3 twice, 4.4) in one chapter, Electricity", () => {
    expect(topicalChapters(physics)).toEqual([
      { key: "4.1", label: "Ch 4.1: Simple Phenomena of Magnetism", count: 1 },
      { key: ELECTRICITY_GROUP, label: "Ch 4: Electricity", count: 4 },
      { key: "4.5", label: "Ch 4.5: Electromagnetic Effects", count: 1 },
    ]);
  });
  it("gives Electric Circuits and Digital Electronics the same picker group, and leaves magnetism and other subjects alone", () => {
    expect(pickerChapterOf(physics[2]!.title)).toBe(ELECTRICITY_GROUP);
    expect(pickerChapterOf(physics[3]!.title)).toBe(ELECTRICITY_GROUP);
    expect(pickerChapterOf(physics[0]!.title)).toBe("4.1");
    expect(pickerChapterOf(physics[5]!.title)).toBe("4.5");
    expect(pickerChapterOf("CAIE IGCSE Chemistry Ch4.3 Something (Theory) Worksheet 1")).toBe("4.3");
    expect(pickerChapterOf("CAIE A Level Physics Ch4 Forces (Theory) Worksheet 1")).toBe("4");
    expect(pickerChapterOf("Mixed revision")).toBeNull();
  });
  it("sorts chapter 10 after chapter 9", () => {
    expect(topicalChapters([{ qpId: "x", title: "Ch10 A (P1) Worksheet 1" }, { qpId: "y", title: "Ch9 B (P1) Worksheet 1" }]).map((c) => c.key)).toEqual(["9", "10"]);
  });
  it("offers the paper type choice when a subject has more than one kind anywhere", () => {
    const lib = { B: { S: { "Paper 1": [{ qpId: "1", title: "t" }], "Paper 2": [] } } };
    const yearly = { B: { S: { "Paper 2": [{ paperId: "p", year: 2020, session: "s", title: "t" }] } } };
    expect(subjectHasTypes(lib, yearly, {}, "B", "S")).toEqual({ topical: true, yearly: true, solved: false });
    expect(subjectHasTypes(lib, {}, {}, "B", "S")).toEqual({ topical: true, yearly: false, solved: false });
    expect(subjectHasTypes({}, yearly, { B: { S: { X: [{ solvedId: "s", title: "T", kind: "Guide", pages: 1 }] } } }, "B", "S")).toEqual({ topical: false, yearly: true, solved: true });
  });
});

describe("yearly papers have no chapter (TKT-0350)", () => {
  it("names a yearly paper by session, year and paper", () => {
    expect(yearlyPaperName("9618_w24_22")).toBe("Past paper Oct/Nov 2024, Paper 22");
    expect(yearlyPaperName("0625_m26_42")).toBe("Past paper Feb/Mar 2026, Paper 42");
    expect(yearlyPaperName("0510_s16_21")).toBe("Past paper May/Jun 2016, Paper 21");
  });
  it("leaves a topical worksheet id alone", () => { expect(yearlyPaperName("1Z-aYRcmB70ZiQWhLipoxvKcMEeMNAefk")).toBeNull(); expect(yearlyPaperName(null)).toBeNull(); });
  it("History shows the paper in the Chapter column when there is no chapter, and the chapter when there is", () => {
    const row = (paper_id: string, chapter: string | null) => ({ id: "a", account_id: "S", subject: "A Levels Computer Science", chapter, paper_id, mode: "test", score: 3, total_questions: 6, time_taken_seconds: 60, submitted_at: "2026-10-14T00:00:00Z" });
    const rows = historyRows([row("9618_w24_22", null), row("abc", null), row("xyz", "5")], (_s, ch) => `Ch ${ch}`);
    expect(rows.map((r) => r.chapter).reverse()).toEqual(["Past paper Oct/Nov 2024, Paper 22", "—", "Ch 5"]);
  });
});

describe("question search hit", () => {
  const hit: SearchHit = { qpId: "QP1", msId: "MS1", board: "IGCSE", subject: "Mathematics", component: "Paper 2: Non-calculator (Extended)", title: "CAIE IGCSE Maths Ch1 Bounds (Paper 2 - Easy) Worksheet 1", questionNumber: "6", structured: true, snippet: "…upper bound…" };
  it("opens as a topical paper with the hit's own component and the same tracking meta the picker makes", () => {
    const pick = hitToPick(hit);
    expect(pick).toEqual({ paper: { qpId: "QP1", msId: "MS1", title: hit.title }, structured: true, meta: { subject: "IGCSE Mathematics", chapter: chapterKey(hit.title), paperId: "QP1" }, component: hit.component });
  });
  it("a paper without a mark scheme cannot be opened", () => expect(hitToPick({ ...hit, msId: null })).toBeNull());
  it("the query is trimmed and its spaces collapsed", () => expect(searchQueryOf("  upper \n  bound ")).toBe("upper bound"));
});

// TKT-0426: the name a downloaded document is saved under
describe("pdfFileName", () => {
  it("keeps a normal label and adds one .pdf", () => {
    expect(pdfFileName("ZNotes -- Physics Theory")).toBe("ZNotes -- Physics Theory.pdf");
    expect(pdfFileName("ZNotes -- Physics Theory.pdf")).toBe("ZNotes -- Physics Theory.pdf");
    expect(pdfFileName("Notes.PDF")).toBe("Notes.pdf");
  });
  it("removes characters a file system refuses and tidies spaces", () => {
    expect(pdfFileName('Maths: P1/P2 "revision" <1>?')).toBe("Maths P1 P2 revision 1.pdf");
    expect(pdfFileName("  two   spaces ")).toBe("two spaces.pdf");
  });
  it("copes with nothing, and keeps long names short", () => {
    expect(pdfFileName("")).toBe("document.pdf");
    expect(pdfFileName(undefined)).toBe("document.pdf");
    expect(pdfFileName("///")).toBe("document.pdf");
    expect(pdfFileName("a".repeat(300)).length).toBe(124);
  });
});

describe("imageBox (TKT-0436)", () => {
  // a real 1190 x 1648 PNG header: signature, IHDR length, "IHDR", width, height
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x04, 0xa6, 0, 0, 0x06, 0x70];
  const url = "data:image/png;base64," + btoa(String.fromCharCode(...header)) + "AAAA";
  it("reads width and height from a PNG data URL", () => { expect(imageBox(url)).toEqual({ width: 1190, height: 1648 }); });
  it("gives nothing for a JPEG, a plain address, an empty value or a broken PNG", () => {
    expect(imageBox("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ")).toEqual({});
    expect(imageBox("https://example.com/a.png")).toEqual({});
    expect(imageBox(undefined)).toEqual({});
    expect(imageBox("data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toEqual({});
    expect(imageBox("data:image/png;base64,@@@@")).toEqual({});
  });
});

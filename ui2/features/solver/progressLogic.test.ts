import { describe, expect, it } from "vitest";
import { completionFor, isGoodPick, pickHint, statusIndex, statusLabel, statusOf, togo, trendNote } from "./progressLogic";
import type { AttemptRow, Library, YearlyLibrary } from "./solverTypes";

const at = (paper_id: string, over: Partial<AttemptRow> = {}): AttemptRow => ({ account_id: "A", subject: "IGCSE Physics", chapter: "1", paper_id, mode: "test", score: 8, total_questions: 10, time_taken_seconds: 60, submitted_at: "2026-10-01T00:00:00Z", ...over });

describe("paper status", () => {
  it("no attempts: new, a good pick", () => { const s = statusOf([]); expect(s.state).toBe("new"); expect(statusLabel(s)).toBe("Not tried"); expect(isGoodPick(s)).toBe(true); expect(pickHint(s)).toBe("good pick"); });
  it("practice only: practised, no score", () => {
    const s = statusOf([at("p", { mode: "practice", score: null })]);
    expect(s.state).toBe("practised"); expect(s.best).toBeNull(); expect(statusLabel(s)).toBe("Practised once");
    expect(statusLabel(statusOf([at("p", { mode: "practice", score: null }), at("p", { mode: "practice", score: null })]))).toBe("Practised 2 times");
  });
  it("best test under 70 percent: worth another go", () => {
    const s = statusOf([at("p", { score: 4 }), at("p", { score: 6 })]);
    expect(s.state).toBe("retry"); expect(s.best).toBe(60); expect(pickHint(s)).toBe("worth another go"); expect(isGoodPick(s)).toBe(true);
  });
  it("70 to 99 percent: solid, not a pick; every question right: full marks", () => {
    expect(statusOf([at("p", { score: 7 })]).state).toBe("solid");
    expect(isGoodPick(statusOf([at("p", { score: 9 })]))).toBe(false);
    const f = statusOf([at("p", { score: 10 })]); expect(f.state).toBe("full"); expect(statusLabel(f)).toBe("Full marks");
  });
  it("a later weak attempt does not lower the best", () => expect(statusOf([at("p", { score: 9 }), at("p", { score: 2, submitted_at: "2026-10-09T00:00:00Z" })]).state).toBe("solid"));
  it("an untimed practice attempt after a test keeps the test result", () => expect(statusOf([at("p", { score: 8 }), at("p", { mode: "practice", score: null })]).best).toBe(80));
  it("index groups by paper", () => { const i = statusIndex([at("a"), at("b", { score: 1 }), at("a", { score: 10 })]); expect(i.a?.state).toBe("full"); expect(i.b?.state).toBe("retry"); });
});

describe("completion", () => {
  const lib: Library = { IGCSE: { Physics: { MCQ: [{ qpId: "a", title: "Ch1 A" }, { qpId: "b", title: "Ch1 B" }, { qpId: "c", title: "Ch2 C" }] } } };
  const yearly: YearlyLibrary = { IGCSE: { Physics: { "Paper 4": [{ paperId: "y1", year: 2020, session: "May", variant: "41", title: "t" }, { paperId: "y2", year: 2020, session: "May", variant: "42", title: "t" }], "Examiner Report": [{ paperId: "r1", year: 2020, session: "May", title: "r" }] } } };
  it("counts tried, solved, and the questions behind them", () => {
    const rows = [at("a", { score: 9 }), at("a", { score: 3 }), at("b", { score: 4 }), at("y1", { score: 10 })];
    const [topical, yr] = completionFor(lib, yearly, rows);
    expect(topical).toMatchObject({ subject: "IGCSE Physics", kind: "topical", total: 3, tried: 2, solved: 1, questionsRight: 13, questionsAsked: 20 });
    expect(yr).toMatchObject({ kind: "yearly", total: 2, tried: 1, solved: 1 }); // the examiner report is not a paper to solve
    expect(togo(topical!)).toBe("2 to go");
  });
  it("all solved says so; a paper nobody opened is not tried", () => {
    const rows = ["a", "b", "c"].map((p) => at(p, { score: 10 }));
    const [t] = completionFor(lib, {}, rows);
    expect(togo(t!)).toBe("All solved");
    expect(completionFor(lib, {}, [])[0]).toMatchObject({ tried: 0, solved: 0, questionsAsked: 0 });
  });
  it("attempts on papers no longer in the library are ignored", () => expect(completionFor(lib, {}, [at("gone", { score: 10 })])[0]).toMatchObject({ tried: 0 }));
});

describe("trend note", () => {
  const day = (n: number, score: number) => at("p", { score, submitted_at: `2026-10-${String(n).padStart(2, "0")}T00:00:00Z` });
  it("says what it can with 0 or 1 Tests", () => { expect(trendNote([])).toBe("No Tests yet."); expect(trendNote([day(1, 5), at("q", { mode: "practice", score: null })])).toMatch(/One Test so far/); });
  it("up, down and steady, from the last five Tests in date order", () => {
    expect(trendNote([day(3, 8), day(1, 5), day(2, 6)])).toBe("Up 30 points over your last 3 Tests.");
    expect(trendNote([day(1, 9), day(2, 7)])).toBe("Down 20 points over your last 2 Tests.");
    expect(trendNote([day(1, 7), day(2, 7), day(3, 7)])).toBe("Steady over your last 3 Tests, at about 70%.");
    expect(trendNote([day(1, 1), day(2, 8), day(3, 8), day(4, 8), day(5, 8), day(6, 8)])).toBe("Steady over your last 5 Tests, at about 80%."); // the first Test is older than the window
  });
});

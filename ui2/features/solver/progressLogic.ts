import { isReadingComponent } from "./solverLogic";
import type { AttemptRow, Library, YearlyLibrary } from "./solverTypes";

/** A scored Test below this percent is "worth another go"; at or above it the paper counts as solved. */
export const SOLID_AT = 70;

/** new: never opened. practised: only Practice mode (no score). retry: best Test below SOLID_AT. solid: best Test at SOLID_AT or more. full: a Test with every question right. */
export type PaperState = "new" | "practised" | "retry" | "solid" | "full";
export interface PaperStatus { state: PaperState; tests: number; practices: number; best: number | null; lastAt: string | null }

const pct = (a: Pick<AttemptRow, "score" | "total_questions">) => (a.total_questions > 0 && a.score != null ? (a.score / a.total_questions) * 100 : 0);
const scored = (a: AttemptRow) => a.mode !== "practice" && a.score != null;

export const NEW_PAPER: PaperStatus = { state: "new", tests: 0, practices: 0, best: null, lastAt: null };

/** The status of one paper from the attempts the student made on it. */
export function statusOf(attempts: readonly AttemptRow[]): PaperStatus {
  if (attempts.length === 0) return NEW_PAPER;
  const tests = attempts.filter(scored);
  const best = tests.length ? Math.max(...tests.map(pct)) : null;
  const lastAt = attempts.map((a) => a.submitted_at ?? "").sort().pop() || null;
  const state: PaperState = best == null ? "practised" : best >= 100 ? "full" : best >= SOLID_AT ? "solid" : "retry";
  return { state, tests: tests.length, practices: attempts.length - tests.length, best, lastAt };
}

/** paperId to status, for every paper the account has an attempt on. Papers with no attempt are not in the result (use NEW_PAPER). */
export function statusIndex(attempts: readonly AttemptRow[]): Record<string, PaperStatus> {
  const by = new Map<string, AttemptRow[]>();
  for (const a of attempts) by.set(a.paper_id, [...(by.get(a.paper_id) ?? []), a]);
  return Object.fromEntries([...by].map(([id, rows]) => [id, statusOf(rows)]));
}

/** Short words for the picker, after the paper's title. */
export function statusLabel(s: PaperStatus): string {
  switch (s.state) {
    case "new": return "Not tried";
    case "practised": return s.practices > 1 ? `Practised ${s.practices} times` : "Practised once";
    case "retry": return `Best ${Math.round(s.best ?? 0)}%`;
    case "solid": return `Best ${Math.round(s.best ?? 0)}%`;
    case "full": return "Full marks";
  }
}
/** A paper worth opening next: one never opened, one only practised, or one scored under SOLID_AT. */
export const isGoodPick = (s: PaperStatus) => s.state !== "solid" && s.state !== "full";
export const pickHint = (s: PaperStatus): string => (s.state === "retry" ? "worth another go" : s.state === "new" || s.state === "practised" ? "good pick" : "");

export interface Completion {
  subject: string;
  kind: "topical" | "yearly";
  /** Papers in the library. */
  total: number;
  /** Papers the student has opened in any mode. */
  tried: number;
  /** Papers with a Test at SOLID_AT or more. */
  solved: number;
  /** Questions answered correctly and questions asked, on the best Test of each tested paper. */
  questionsRight: number;
  questionsAsked: number;
}

/** Per subject and kind: how many of the library's papers the student has tried and solved, and the questions behind it. Reading-only components are not papers to solve. */
export function completionFor(lib: Library, yearly: YearlyLibrary, attempts: readonly AttemptRow[]): Completion[] {
  const idx = statusIndex(attempts);
  const bestAttempt = new Map<string, AttemptRow>();
  for (const a of attempts.filter(scored)) {
    const cur = bestAttempt.get(a.paper_id);
    if (!cur || pct(a) > pct(cur)) bestAttempt.set(a.paper_id, a);
  }
  const out: Completion[] = [];
  const tally = (subject: string, kind: Completion["kind"], ids: string[]) => {
    if (ids.length === 0) return;
    const c: Completion = { subject, kind, total: ids.length, tried: 0, solved: 0, questionsRight: 0, questionsAsked: 0 };
    for (const id of ids) {
      const s = idx[id];
      if (!s) continue;
      c.tried += 1;
      if (s.state === "solid" || s.state === "full") c.solved += 1;
      const b = bestAttempt.get(id);
      if (b) { c.questionsRight += b.score ?? 0; c.questionsAsked += b.total_questions; }
    }
    out.push(c);
  };
  for (const [board, subjects] of Object.entries(lib)) for (const [subject, comps] of Object.entries(subjects)) {
    tally(`${board} ${subject}`, "topical", [...new Set(Object.values(comps).flatMap((ps) => ps.map((p) => p.qpId)))]);
  }
  for (const [board, subjects] of Object.entries(yearly)) for (const [subject, comps] of Object.entries(subjects)) {
    const ids = Object.entries(comps).filter(([c]) => !isReadingComponent(c)).flatMap(([, ps]) => ps.filter((p) => p.variant).map((p) => p.paperId));
    tally(`${board} ${subject}`, "yearly", [...new Set(ids)]);
  }
  return out.sort((a, b) => a.subject.localeCompare(b.subject) || a.kind.localeCompare(b.kind));
}

/** "All solved", or how far there is to go. */
export function togo(c: Completion): string {
  const left = c.total - c.solved;
  return left === 0 ? "All solved" : `${left} to go`;
}

/** One plain sentence on where the scores are heading: the last five Tests, oldest to newest. Fewer than two Tests: say there is nothing to compare yet. */
export function trendNote(attempts: readonly AttemptRow[]): string {
  const tests = attempts.filter(scored).sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? "")).slice(-5);
  if (tests.length === 0) return "No Tests yet.";
  if (tests.length === 1) return "One Test so far. Take another to see a trend.";
  const first = pct(tests[0] as AttemptRow);
  const last = pct(tests[tests.length - 1] as AttemptRow);
  const diff = Math.round(last - first);
  if (diff >= 3) return `Up ${diff} points over your last ${tests.length} Tests.`;
  if (diff <= -3) return `Down ${-diff} points over your last ${tests.length} Tests.`;
  return `Steady over your last ${tests.length} Tests, at about ${Math.round(last)}%.`;
}

import type { AttemptMeta, AttemptRow, GradeResult, Library, McqQuestion, SubjectMeta, TopicalPaper, YearlyLibrary, YearlyPaper } from "./solverTypes";

// ---- chapter and title parsing (ported from the classic Question Solver) --------------------------------

const CHAPTER_PATTERNS = [/Ch(\d+(?:\.\d+)?)/i, /^(\d+(?:\.\d+)?)[-\s]/];
export function chapterOf(title: string | undefined): string | null {
  for (const pat of CHAPTER_PATTERNS) {
    const m = pat.exec(title || "");
    if (m) return m[1] as string;
  }
  return null;
}
const WORKSHEET_NUMBER = /Worksheet\s*(\d+)/i;
const CHAPTER_NAME_PATTERNS: { re: RegExp; clean: (s: string) => string }[] = [
  { re: /Ch\d+(?:\.\d+)?\s+(.+?)\s*\(MCQ\)/i, clean: (s) => s.trim() },
  { re: /^\d+(?:\.\d+)?-(.+?)-_ial-cie-chemistry$/i, clean: (s) => s.replace(/_+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) },
  { re: /Ch\d+(?:\.\d+)?\s+(.+?)\s*\([^)]*\)\s*Worksheet\b/i, clean: (s) => s.trim() },
];
export function chapterNameOf(title: string | undefined): string | null {
  for (const { re, clean } of CHAPTER_NAME_PATTERNS) {
    const m = re.exec(title || "");
    if (m) return clean(m[1] as string);
  }
  return null;
}
/** "3 Atomic structure" when the title has both a chapter number and a name, else just the number, else null. */
export function chapterKey(title: string | undefined): string | null {
  const num = chapterOf(title);
  if (!num) return null;
  const name = chapterNameOf(title);
  return name ? `${num} ${name}` : num;
}
/** Chapter, then worksheet number, then title: the order papers are listed in. */
export function comparePapers(a: TopicalPaper, b: TopicalPaper): number {
  const key = (t: string): [number, number, string] => {
    const ch = parseFloat(chapterOf(t) ?? "");
    const ws = WORKSHEET_NUMBER.exec(t || "");
    return [Number.isNaN(ch) ? Infinity : ch, ws ? parseInt(ws[1] as string, 10) : 0, t || ""];
  };
  const [an, aw, at] = key(a.title);
  const [bn, bw, bt] = key(b.title);
  if (an !== bn) return an === Infinity ? 1 : bn === Infinity ? -1 : an - bn;
  if (aw !== bw) return aw - bw;
  return at.localeCompare(bt);
}
export function naturalQuestionSort(a: string, b: string): number {
  const parse = (s: string): [number, string] => {
    const m = /^(\d+)(.*)$/.exec(String(s ?? ""));
    return m ? [parseInt(m[1] as string, 10), m[2] as string] : [Infinity, String(s ?? "")];
  };
  const [an, as] = parse(a);
  const [bn, bs] = parse(b);
  return an !== bn ? (an === Infinity ? 1 : bn === Infinity ? -1 : an - bn) : as.localeCompare(bs);
}
export const formatTimer = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

// ---- picker options ----------------------------------------------------------------------------------------

export const isStructuredComponent = (meta: SubjectMeta, board: string, subject: string, component: string) => {
  const entry = meta[board]?.[subject];
  return !!entry && component !== entry.mcqComponent;
};
export const boardsOf = (lib: Library, yearly: YearlyLibrary) => [...new Set([...Object.keys(lib), ...Object.keys(yearly)])];
export const subjectsOf = (lib: Library, yearly: YearlyLibrary, board: string) => [...new Set([...Object.keys(lib[board] ?? {}), ...Object.keys(yearly[board] ?? {})])];
/** Components with at least one worksheet first, then components that only have yearly papers. */
export function componentsOf(lib: Library, yearly: YearlyLibrary, board: string, subject: string): string[] {
  const topical = lib[board]?.[subject] ?? {};
  const nonEmpty = Object.keys(topical).filter((c) => (topical[c] ?? []).length > 0);
  const yearlyOnly = Object.keys(yearly[board]?.[subject] ?? {}).filter((c) => !nonEmpty.includes(c));
  return [...nonEmpty, ...yearlyOnly];
}
export type PaperType = "topical" | "yearly";
/** Which Paper Type choices the picker offers for a component, and the one to start on. */
export function paperTypes(topical: readonly unknown[], yearly: readonly unknown[]): { show: boolean; value: PaperType; options: PaperType[] } {
  if (yearly.length === 0) return { show: false, value: "topical", options: ["topical"] };
  if (topical.length === 0) return { show: false, value: "yearly", options: ["yearly"] };
  return { show: true, value: "topical", options: ["topical", "yearly"] };
}
/** The reading-only components open a PDF instead of starting a quiz. */
export const isReadingComponent = (component: string) => component === "Examiner Report" || component.startsWith("ZNotes: ") || component.startsWith("Sample Response: ");
export function fetchButtonLabel(component: string): string {
  return component === "Examiner Report" ? "View examiner report" : component.startsWith("ZNotes: ") ? "View notes" : component.startsWith("Sample Response: ") ? "View sample responses" : "Fetch this paper and start";
}
export const yearsOf = (papers: readonly YearlyPaper[]) => [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a);
export const sessionsOf = (papers: readonly YearlyPaper[], year: number) => [...new Set(papers.filter((p) => p.year === year).map((p) => p.session))];
export const yearlyPaperLabel = (p: YearlyPaper) => (p.variant ? `Paper ${p.variant}` : "Examiner Report");

/** paperId to a readable title, from every source the solver has (worksheets, yearly papers, the account's own history). */
export function titleIndex(lib: Library, yearly: YearlyLibrary, extra: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const subjects of Object.values(lib)) for (const comps of Object.values(subjects)) for (const papers of Object.values(comps)) for (const p of papers) out[p.qpId] = p.title;
  for (const subjects of Object.values(yearly)) for (const comps of Object.values(subjects)) for (const papers of Object.values(comps)) for (const p of papers) if (p.paperId) out[p.paperId] = p.title;
  for (const [id, t] of Object.entries(extra)) if (!(id in out)) out[id] = t;
  return out;
}
/** `${subject}::${chapterNumber}` to the chapter's name, so a bare "3" can be shown as "3 Atomic structure". */
export function chapterNames(lib: Library, titlesById: Record<string, string> = {}, subjectsById: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (subject: string, title: string) => {
    const n = chapterOf(title);
    const name = chapterNameOf(title);
    if (n && name && !out[`${subject}::${n}`]) out[`${subject}::${n}`] = name;
  };
  for (const [board, subjects] of Object.entries(lib)) for (const [subject, comps] of Object.entries(subjects)) for (const papers of Object.values(comps)) for (const p of papers) add(`${board} ${subject}`, p.title);
  for (const [id, t] of Object.entries(titlesById)) if (subjectsById[id]) add(subjectsById[id] as string, t);
  return out;
}
export function chapterLabel(names: Record<string, string>, subject: string, chapter: string | null | undefined): string {
  if (!chapter) return "—";
  if (/\s/.test(chapter)) return chapter;
  const name = names[`${subject}::${chapter}`];
  return name ? `${chapter} ${name}` : chapter;
}

// ---- grading and results -----------------------------------------------------------------------------------

export type Verdict = "correct" | "incorrect" | "unanswered" | "unmatched";
export interface McqResult extends McqQuestion { studentAnswer: string | null; verdict: Verdict; flagged: boolean }

/** Verdict per question: unmatched when the mark scheme gave no single answer, unanswered when nothing was picked. */
export function gradeMcq(quiz: readonly McqQuestion[], answers: Readonly<Record<string, string>>, flags: ReadonlySet<string>): { results: McqResult[]; correct: number; gradable: number; attemptedGradable: number } {
  const results = quiz.map<McqResult>((q) => {
    const studentAnswer = answers[q.questionNumber] ?? null;
    const verdict: Verdict = !q.correctAnswer ? "unmatched" : !studentAnswer ? "unanswered" : studentAnswer === q.correctAnswer ? "correct" : "incorrect";
    return { ...q, studentAnswer, verdict, flagged: flags.has(q.questionNumber) };
  });
  return { results, correct: results.filter((r) => r.verdict === "correct").length, gradable: quiz.filter((q) => q.correctAnswer).length, attemptedGradable: results.filter((r) => r.verdict === "correct" || r.verdict === "incorrect").length };
}
/** A structured answer counts only with full marks. Questions that cannot be auto-graded are left out of the total. */
export function scoreStructured(graded: readonly GradeResult[]): { gradable: GradeResult[]; correct: number } {
  const gradable = graded.filter((g) => !g.ungradable);
  return { gradable, correct: gradable.filter((g) => g.marksAwarded === g.marksAvailable && g.marksAvailable > 0).length };
}
export const isFullMarks = (g: GradeResult) => !g.ungradable && g.marksAwarded === g.marksAvailable && g.marksAvailable > 0;

export interface MistakeItem { questionNumber: string; verdict: string }
/** The body of POST /api/mcq/mistakes: only questions that were really answered (correct or incorrect) are sent. */
export function mistakeResults<T extends MistakeItem>(items: readonly T[]) {
  const rows = items as readonly (T & Record<string, unknown>)[];
  return rows
    .filter((r) => r.verdict === "correct" || r.verdict === "incorrect")
    .map((r) => {
      const out: Record<string, unknown> = { questionNumber: r.questionNumber, correct: r.verdict === "correct" };
      if (r.studentAnswer !== undefined) for (const k of ["studentAnswer", "marksAwarded", "marksAvailable", "remark", "lineFeedback", "markBreakdown", "styleChecklist", "fullMarkAnswer", "lowConfidence", "flagged", "correctAnswer"]) out[k] = r[k];
      return out;
    });
}

// ---- progress ------------------------------------------------------------------------------------------------

export const pctOf = (a: Pick<AttemptRow, "score" | "total_questions">) => (a.total_questions > 0 && a.score != null ? (a.score / a.total_questions) * 100 : 0);
export const isGraded = (a: AttemptRow) => a.mode !== "practice" && a.score != null;
export interface ProgressScope { subject: string; chapter: string }
export const attemptMatches = (a: AttemptRow, s: ProgressScope) => (!s.subject || a.subject === s.subject) && (!s.chapter || a.chapter === s.chapter);
/** The lines of the progress chart: each student's graded attempts in order, with the viewer's own kept apart. */
export function seriesByAccount(all: readonly AttemptRow[], s: ProgressScope, me: string): { mine: AttemptRow[]; others: Record<string, AttemptRow[]> } {
  const mine: AttemptRow[] = [];
  const others: Record<string, AttemptRow[]> = {};
  for (const a of all) {
    if (!attemptMatches(a, s) || !isGraded(a)) continue;
    if (a.account_id === me) mine.push(a);
    else (others[a.account_id] ||= []).push(a);
  }
  return { mine, others };
}
export interface HistoryRow { id: string | undefined; paperId: string; mode: "Practice" | "Test"; score: string; percent: string; time: string; when: string; chapter: string; canView: boolean }
export function historyRows(mine: readonly AttemptRow[], chapter: (subject: string, ch: string | null) => string): HistoryRow[] {
  return [...mine].reverse().map((a) => {
    const practice = a.mode === "practice" || a.score == null;
    return {
      id: a.id, paperId: a.paper_id, mode: practice ? "Practice" : "Test", chapter: chapter(a.subject, a.chapter), canView: !practice && !!a.id,
      score: practice ? "—" : `${a.score} / ${a.total_questions}`, percent: practice ? "—" : `${Math.round(((a.score as number) / a.total_questions) * 1000) / 10}%`,
      time: a.time_taken_seconds != null ? formatTimer(a.time_taken_seconds) : "—", when: a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "",
    };
  });
}

export interface AutosaveRecord { v: 1; acct: string; kind: "mcq" | "structured"; paperKey: string; savedAt: number; elapsed: number; answers?: Record<string, string>; flags?: string[]; texts?: Record<string, string> }
export const AUTOSAVE_KEY = "mcqTestAutosave.v1"; // the same key as the classic Question Solver, so an attempt started in one UI can be resumed in the other
export const AUTOSAVE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** May this saved attempt be offered for resuming? Same account, same kind of quiz, same paper, under a day old. */
export function resumable(rec: AutosaveRecord | null, kind: "mcq" | "structured", account: string, meta: AttemptMeta | null, now = Date.now()): rec is AutosaveRecord {
  return !!rec && rec.v === 1 && rec.kind === kind && rec.acct === account && !!meta && rec.paperKey === meta.paperId && now - rec.savedAt < AUTOSAVE_MAX_AGE_MS;
}

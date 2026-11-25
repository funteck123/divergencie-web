import { checkSelfMark } from "./selfMarkLogic";
import { naturalQuestionSort } from "./solverLogic";
import type { QuestionResponse } from "./solverTypes";

/** TKT-0445: the teacher's check of a self-marked paper. Pure rules, tested without a browser. */
export const SELF_PREFIX = "Self-marked by the student";
export const CHECK_PREFIX = "Teacher check by ";

export interface SelfRow { q: string; answer: string; awarded: number; available: number; note: string }
export interface CheckEdit { awarded: string; outOf: string; comment: string }

/** The student's own marked answers of an attempt, in paper order, with the note they wrote. */
export function selfRows(responses: readonly QuestionResponse[]): SelfRow[] {
  return responses
    .filter((r) => (r.remark ?? "").startsWith(SELF_PREFIX) && r.marks_awarded != null && r.marks_available != null)
    .map((r) => ({ q: r.question_number, answer: r.student_answer ?? "", awarded: r.marks_awarded as number, available: r.marks_available as number, note: /Note: (.*)$/s.exec(r.remark ?? "")?.[1]?.trim() ?? "" }))
    .sort((a, b) => naturalQuestionSort(a.q, b.q));
}

/** The boxes start on the student's own marks, so "agree" is one press and a change is one edit. */
export const initialEdits = (rows: readonly SelfRow[]): Record<string, CheckEdit> =>
  Object.fromEntries(rows.map((r) => [r.q, { awarded: String(r.awarded), outOf: String(r.available), comment: "" }]));

/** The newest teacher check per question, from the rows saved for the attempt (null when no teacher has checked it). */
export function latestCheck(responses: readonly QuestionResponse[]): { by: string; marks: Record<string, { awarded: number; available: number; remark: string }> } | null {
  const marks: Record<string, { awarded: number; available: number; remark: string }> = {};
  let by = "";
  // the rows arrive oldest first; a later row for the same question replaces an earlier one
  for (const r of responses) {
    if (!(r.remark ?? "").startsWith(CHECK_PREFIX) || r.marks_awarded == null || r.marks_available == null) continue;
    marks[r.question_number] = { awarded: r.marks_awarded, available: r.marks_available, remark: (r.remark as string).slice(CHECK_PREFIX.length) };
    by = /^Teacher check by (.+?): /.exec(r.remark as string)?.[1] ?? by;
  }
  return Object.keys(marks).length ? { by, marks } : null;
}

export type CheckBody = { attemptId: string; rows: { questionNumber: string; marksAwarded: number; marksAvailable: number; comment: string }[] };
/** The body to save, or the first thing wrong with the marks. A box left empty means that question is not part of the check. */
export function buildCheckBody(attemptId: string, rows: readonly SelfRow[], edits: Readonly<Record<string, CheckEdit>>): { ok: true; body: CheckBody } | { ok: false; message: string } {
  const out: CheckBody["rows"] = [];
  for (const r of rows) {
    const e = edits[r.q];
    const c = checkSelfMark({ awarded: e?.awarded ?? "", outOf: e?.outOf ?? "", note: "" });
    if (c.state === "invalid") return { ok: false, message: `Question ${r.q}: ${c.message}` };
    if (c.state === "ok") out.push({ questionNumber: r.q, marksAwarded: c.awarded, marksAvailable: c.outOf, comment: (e?.comment ?? "").trim() });
  }
  return out.length ? { ok: true, body: { attemptId, rows: out } } : { ok: false, message: "Mark at least one question." };
}

export const totalsOf = (rows: readonly { awarded: number; available: number }[]) => ({ awarded: rows.reduce((s, r) => s + r.awarded, 0), available: rows.reduce((s, r) => s + r.available, 0) });

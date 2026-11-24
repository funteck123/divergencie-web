import type { SelfMark } from "./quizMachine";

/**
 * Self-marking (TKT-0442): after a written test is ended, the student reads the mark scheme and gives each question their own marks.
 * Marks are whole numbers, as on a Cambridge mark scheme. A question with nothing typed is left out, not counted as zero.
 * The rules sit here so they are tested without a browser.
 */
export type SelfMarkRow =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "ok"; awarded: number; outOf: number; note: string };

const WHOLE = /^\d{1,3}$/;

export function checkSelfMark(m: SelfMark | undefined): SelfMarkRow {
  const awarded = (m?.awarded ?? "").trim();
  const outOf = (m?.outOf ?? "").trim();
  if (!awarded && !outOf) return { state: "empty" };
  if (!outOf) return { state: "invalid", message: "Write how many marks the question is worth." };
  if (!awarded) return { state: "invalid", message: "Write the marks you give yourself." };
  if (!WHOLE.test(awarded) || !WHOLE.test(outOf)) return { state: "invalid", message: "Use whole numbers." };
  const a = Number(awarded), o = Number(outOf);
  if (o < 1) return { state: "invalid", message: "A question is worth at least 1 mark." };
  if (a > o) return { state: "invalid", message: "You cannot give more marks than the question is worth." };
  return { state: "ok", awarded: a, outOf: o, note: (m?.note ?? "").trim() };
}

export interface SelfMarkTotals { awarded: number; outOf: number; marked: number; invalid: number; fullMarks: number }

/** The paper total over the questions that were marked, in the order of the paper. */
export function selfMarkTotals(order: readonly string[], marks: Readonly<Record<string, SelfMark>>): SelfMarkTotals {
  const t: SelfMarkTotals = { awarded: 0, outOf: 0, marked: 0, invalid: 0, fullMarks: 0 };
  for (const q of order) {
    const r = checkSelfMark(marks[q]);
    if (r.state === "invalid") t.invalid++;
    if (r.state !== "ok") continue;
    t.awarded += r.awarded; t.outOf += r.outOf; t.marked++;
    if (r.awarded === r.outOf) t.fullMarks++;
  }
  return t;
}

/** The note a self-marked answer carries in the saved history, so a teacher can tell it from an AI mark. */
export const selfMarkRemark = (note: string) => (note.trim() ? `Self-marked by the student. Note: ${note.trim()}` : "Self-marked by the student.");

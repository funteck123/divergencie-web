/**
 * The quiz as one state machine: idle (library), ready (paper loaded, mode not chosen), running, paused, submitted (graded
 * view), reviewing (the student looks over results). A pure reducer: no timers, no network. The screen drives it (a
 * timer sends "tick") and reads from it, so every rule below is testable without a browser.
 *
 * Rules carried over from the classic Question Solver:
 *  - the timer only advances while running; pausing keeps answers editable (the classic page never locked the inputs)
 *  - flags exist only in test and mistakes mode; practice has no answers, only the Question and Answer tabs
 *  - an answer can be changed freely until submit; submit stops the clock and cannot be undone
 *  - cancelling a test or mistakes attempt throws the answers away (the screen asks first); cancelling practice just leaves
 *  - a resumed attempt restores answers, flags, written texts and elapsed time
 */
export type Phase = "idle" | "ready" | "running" | "paused" | "submitted" | "reviewing";
export type Mode = "practice" | "test" | "mistakes";
export type Kind = "mcq" | "structured";

export interface QuizState {
  phase: Phase;
  kind: Kind;
  mode: Mode | null;
  /** Question numbers in order. */
  order: readonly string[];
  /** Index into `order` of the question on screen. */
  index: number;
  elapsed: number;
  answers: Readonly<Record<string, string>>;
  flags: readonly string[];
  texts: Readonly<Record<string, string>>;
  /** Test mode only: tell the student at once whether a letter is right. */
  instantCheck: boolean;
}

export type QuizAction =
  | { type: "load"; kind: Kind; order: readonly string[] }
  | { type: "start"; mode: Mode }
  | { type: "tick" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "answer"; q: string; letter: string }
  | { type: "clearAnswer"; q: string }
  | { type: "text"; q: string; text: string }
  | { type: "flag"; q: string }
  | { type: "goto"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "instantCheck"; on: boolean }
  | { type: "restore"; elapsed: number; answers?: Record<string, string>; flags?: string[]; texts?: Record<string, string> }
  | { type: "submit" }
  | { type: "review" }
  | { type: "cancel" }
  | { type: "finishPractice" };

export const initialQuiz: QuizState = { phase: "idle", kind: "mcq", mode: null, order: [], index: 0, elapsed: 0, answers: {}, flags: [], texts: {}, instantCheck: false };

const live = (s: QuizState) => s.phase === "running" || s.phase === "paused";
const known = (s: QuizState, q: string) => s.order.includes(q);

export function quizReducer(s: QuizState, a: QuizAction): QuizState {
  switch (a.type) {
    case "load":
      return { ...initialQuiz, phase: "ready", kind: a.kind, order: a.order, instantCheck: s.instantCheck };
    case "start":
      if (s.phase !== "ready") return s;
      return { ...s, phase: "running", mode: a.mode, index: 0, elapsed: 0, answers: {}, flags: [], texts: {} };
    case "tick":
      return s.phase === "running" ? { ...s, elapsed: s.elapsed + 1 } : s;
    case "pause":
      return s.phase === "running" ? { ...s, phase: "paused" } : s;
    case "resume":
      return s.phase === "paused" ? { ...s, phase: "running" } : s;
    case "answer":
      if (!live(s) || s.mode === "practice" || s.kind !== "mcq" || !known(s, a.q)) return s;
      return { ...s, answers: { ...s.answers, [a.q]: a.letter } };
    case "clearAnswer": {
      if (!live(s) || !(a.q in s.answers)) return s;
      const { [a.q]: _drop, ...rest } = s.answers;
      return { ...s, answers: rest };
    }
    case "text":
      if (!live(s) || s.mode !== "test" || s.kind !== "structured" || !known(s, a.q)) return s;
      return { ...s, texts: { ...s.texts, [a.q]: a.text } };
    case "flag":
      if (!live(s) || s.mode === "practice" || !known(s, a.q)) return s;
      return { ...s, flags: s.flags.includes(a.q) ? s.flags.filter((x) => x !== a.q) : [...s.flags, a.q] };
    case "goto":
      return live(s) && a.index >= 0 && a.index < s.order.length ? { ...s, index: a.index } : s;
    case "next":
      return live(s) ? { ...s, index: Math.min(s.order.length - 1, s.index + 1) } : s;
    case "prev":
      return live(s) ? { ...s, index: Math.max(0, s.index - 1) } : s;
    case "instantCheck":
      return { ...s, instantCheck: a.on };
    case "restore":
      if (!live(s)) return s;
      return { ...s, elapsed: a.elapsed, answers: { ...(a.answers ?? {}) }, flags: [...(a.flags ?? [])], texts: { ...(a.texts ?? {}) } };
    case "submit":
      return live(s) && s.mode !== "practice" ? { ...s, phase: "submitted" } : s;
    case "review":
      return s.phase === "submitted" ? { ...s, phase: "reviewing" } : s;
    case "cancel":
    case "finishPractice":
      if (a.type === "finishPractice" && s.mode !== "practice") return s;
      return { ...initialQuiz, instantCheck: s.instantCheck };
  }
}

/** Questions that still have no answer: where the student should look before submitting. */
export const unansweredQuestions = (s: QuizState) => (s.kind === "mcq" ? s.order.filter((q) => !(q in s.answers)) : s.order.filter((q) => !(s.texts[q] ?? "").trim()));
export const isClockRunning = (s: QuizState) => s.phase === "running";
/** Whether leaving now loses work, so the screen should ask first. */
export const needsCancelConfirm = (s: QuizState) => live(s) && (s.mode === "test" || s.mode === "mistakes");

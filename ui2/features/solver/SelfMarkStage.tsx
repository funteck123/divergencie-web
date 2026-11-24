"use client";

import { Button } from "@/ui2/components/Button";
import { Field, TextArea, TextInput } from "@/ui2/components/Field";
import { formatTimer, imageBox } from "./solverLogic";
import { checkSelfMark, selfMarkTotals } from "./selfMarkLogic";
import type { QuizAction, SelfMark } from "./quizMachine";
import type { StructuredItem } from "./solverTypes";
import "./solver.css";

/** Between ending a written test and submitting it: the student chooses AI grading or marks the paper themselves. */
export function ExamEndedStage(p: { title: string; elapsed: number; answered: number; total: number; error: string; status: string; busy: boolean; onAi: () => void; onSelf: () => void; onReopen: () => void; onLeave: () => void }) {
  return (
    <div className="u2-solver">
      <h2>{p.title}</h2>
      <div className="u2-banner" role="status">
        <span>Exam ended</span>
        <span className="u2-banner__big">{formatTimer(p.elapsed)}</span>
      </div>
      <p className="u2-muted">{p.answered} of {p.total} questions answered. Your answers are saved on this device.</p>
      {p.error && <p role="alert" className="u2-errorbox">{p.error}</p>}
      {p.status && <p role="status" className="u2-muted">{p.status}</p>}
      <Button variant="primary" loading={p.busy} onClick={p.onAi}>Submit for AI grading</Button>
      <p className="u2-muted">The grader marks each answer against the mark scheme.</p>
      <Button variant="secondary" disabled={p.busy} onClick={p.onSelf}>Mark it myself</Button>
      <p className="u2-muted">You read the mark scheme and give your own marks. Your teacher can check them later.</p>
      <div className="u2-rowactions">
        <Button variant="ghost" disabled={p.busy} onClick={p.onReopen}>← Back to the exam</Button>
        <Button variant="ghost" disabled={p.busy} onClick={p.onLeave}>Leave without saving</Button>
      </div>
    </div>
  );
}

/** Self-marking: for each question the question, the student's own answer, the mark scheme, then marks and an optional note. */
export function SelfMarkStage(p: { title: string; items: readonly StructuredItem[]; texts: Readonly<Record<string, string>>; marks: Readonly<Record<string, SelfMark>>; dispatch: (a: QuizAction) => void; saving: boolean; error: string; onSave: () => void; onBack: () => void }) {
  const order = p.items.map((i) => i.questionNumber);
  const t = selfMarkTotals(order, p.marks);
  return (
    <div className="u2-solver">
      <div className="u2-banner" role="status">
        <span>Your marks, {t.marked} of {order.length} questions marked</span>
        <span className="u2-banner__big">{t.marked === 0 ? "0 / 0" : `${t.awarded} / ${t.outOf}`}</span>
      </div>
      <p className="u2-muted">Read the mark scheme under each question, then give yourself marks. Leave a question empty to skip it.</p>
      {p.items.map((it) => {
        const n = it.questionNumber;
        const m = p.marks[n];
        const row = checkSelfMark(m);
        const set = (field: keyof SelfMark) => (v: string) => p.dispatch({ type: "selfMark", q: n, field, value: v });
        return (
          <article key={n} className="u2-qcard" aria-label={`Question ${n}`}>
            <strong>Question {n}</strong>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service */}
            <img src={it.qImage} alt={`Question ${n}`} loading="lazy" {...imageBox(it.qImage)} />
            <div>
              <span className="u2-muted">Your answer</span>
              <pre className="u2-selfmark__answer">{(p.texts[n] ?? "").trim() || "No answer written."}</pre>
            </div>
            <div>
              <span className="u2-muted">Mark scheme</span>
              {it.msImage
                // eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service
                ? <img src={it.msImage} alt={`Mark scheme for question ${n}`} loading="lazy" {...imageBox(it.msImage)} />
                : <p className="u2-muted">No mark scheme was found for this question.</p>}
            </div>
            <div className="u2-selfmark__marks">
              <Field label="Marks you give" error={row.state === "invalid" ? row.message : undefined}>
                <TextInput inputMode="numeric" value={m?.awarded ?? ""} onChange={(e) => set("awarded")(e.target.value)} />
              </Field>
              <Field label="Out of">
                <TextInput inputMode="numeric" value={m?.outOf ?? ""} onChange={(e) => set("outOf")(e.target.value)} />
              </Field>
            </div>
            <Field label="Note for yourself" hint="Optional.">
              <TextArea rows={2} value={m?.note ?? ""} onChange={(e) => set("note")(e.target.value)} />
            </Field>
          </article>
        );
      })}
      <p><strong>Paper total: {t.marked === 0 ? "0 / 0" : `${t.awarded} / ${t.outOf}`}</strong> <span className="u2-muted">from {t.marked} marked question{t.marked === 1 ? "" : "s"}</span></p>
      {p.error && <p role="alert" className="u2-errorbox">{p.error}</p>}
      <div className="u2-rowactions">
        <Button variant="primary" loading={p.saving} disabled={t.marked === 0 || t.invalid > 0} disabledReason={t.invalid > 0 ? "Fix the marks that are marked in red first." : "Mark at least one question first."} onClick={p.onSave}>Save my marks</Button>
        <Button variant="ghost" disabled={p.saving} onClick={p.onBack}>← Back</Button>
      </div>
    </div>
  );
}

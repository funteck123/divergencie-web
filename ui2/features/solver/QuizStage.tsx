"use client";

import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/ui2/components/Button";
import { CheckField, TextArea } from "@/ui2/components/Field";
import { yearlyAudioUrl } from "@/ui2/queries/solver";
import { PaperPdfLinks } from "./PaperPdfLinks";
import { formatTimer } from "./solverLogic";
import { needsCancelConfirm, unansweredQuestions, type QuizAction, type QuizState } from "./quizMachine";
import type { McqQuestion, StructuredItem, YearlyPaper } from "./solverTypes";
import "./solver.css";

export type GradingStatus = { state: "idle" | "grading" | "done" | "error" | "stale"; seconds?: number; message?: string };

const DIAGRAM_HINT = `Tables -- use pipes, header row then dashes:
| Property | Value |
|---|---|
| e.g. Speed | 5 m/s |

Graphs -- state axes, then the line/points:
AXES: x = Time (s), 0-10 | y = Distance (m), 0-20
LINE: straight, from (0,0) to (10,20)
POINT: P at (4, 8)   (to mark a point on the graph)

Circuits -- chain components, // for parallel branches:
[Cell 6V] -- [Switch] -- [Ammeter] -- [Resistor 10R] -- back to [Cell]
[Cell] -- [Switch] -- ( [R1 5R] // [R2 10R] ) -- back to [Cell]

Rays / forces / fields -- arrows labelled at each end:
Object --> [Convex lens f=5cm] --> Image (real, inverted, magnified)
Force left <--5N-- [Box] --10N--> Force right (net 5N right)

Labelled diagrams -- indented list, say where each part is:
Test tube setup:
- stopper (top, sealed)
- gas produced (inside, rising)
- delivery tube (from stopper, into beaker)
- limewater (in beaker, turns cloudy)

Write any of these as plain text in your answer -- the grader reads them as if you'd drawn the real diagram/table, and marks them the same way. Don't leave a diagram/table mark blank just because you can't draw it here.`;

export interface QuizStageProps {
  state: QuizState;
  dispatch: (a: QuizAction) => void;
  mcq: readonly McqQuestion[];
  structured: readonly StructuredItem[];
  title: string;
  pdfLinks?: { qpId: string; msId?: string; title: string; yearlyId?: string } | null;
  audio?: YearlyPaper | null;
  grading: Readonly<Record<string, GradingStatus>>;
  onGrade: (questionNumber: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onFinishPractice: () => void;
  submitting: boolean;
}

/**
 * The quiz: a pinned bar (timer, pause, cancel, jump numbers, submit; bottom of the screen on a phone) and one question card
 * at a time. The next question's image is loaded ahead, so moving on shows it at once. All state lives in the reducer.
 */
const LAYOUT_KEY = "u2-quiz-layout";
/** One page with every question (default, students asked for it, TKT-0344 and TKT-0338), or one at a time. Remembered in this browser. */
function readLayout(): boolean {
  try { return window.localStorage.getItem(LAYOUT_KEY) !== "one"; } catch { return true; }
}
function writeLayout(onePage: boolean) {
  try { window.localStorage.setItem(LAYOUT_KEY, onePage ? "page" : "one"); } catch { /* private mode: lasts for this visit only */ }
}

export function QuizStage(p: QuizStageProps) {
  const { state: s, dispatch } = p;
  const items = s.kind === "mcq" ? p.mcq : p.structured;
  const cur = items[s.index];
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [page, setPage] = useState<boolean>(() => readLayout());
  const q = cur?.questionNumber ?? "";
  const practice = s.mode === "practice";

  // Load the next question's image while the student reads this one: no network wait when they move on.
  const next = items[s.index + 1];
  const nextImage = next ? ("image" in next ? next.image : next.qImage) : "";
  useEffect(() => {
    if (!nextImage) return;
    const img = new Image();
    img.src = nextImage;
  }, [nextImage]);

  const unanswered = unansweredQuestions(s);
  const confirmCancel = () => {
    if (needsCancelConfirm(s) && !window.confirm("Cancel this attempt? Your answers won't be saved.")) return;
    p.onCancel();
  };
  const selectQuestion = (i: number) => {
    dispatch({ type: "goto", index: i });
    if (page) document.getElementById(`u2-q-${items[i]?.questionNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const chooseLayout = (onePage: boolean) => { setPage(onePage); writeLayout(onePage); };

  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // On a phone the bar is fixed to the bottom of the screen. Its height changes (wrapping title, question strip), so the room left
  // under the last question follows the measured height; a fixed guess once hid the last question under the bar (TKT-0356).
  useEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    if (!root || !bar) return;
    const apply = () => root.style.setProperty("--u2-qbar-h", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="u2-solver" ref={rootRef}>
      {p.audio && (
        <div className="u2-box u2-box--inner">
          <label className="u2-muted" htmlFor="u2-audio">Listening audio</label>
          {p.audio.audioPath ? <audio id="u2-audio" controls preload="metadata" src={yearlyAudioUrl(p.audio.paperId)} className="u2-fill" /> : <p className="u2-muted">The audio track for this paper isn&apos;t available yet, so the questions can&apos;t be answered here. Ask your teacher for the recording.</p>}
        </div>
      )}

      <div className="u2-qbar" role="region" aria-label="Quiz controls" ref={barRef}>
        <div className="u2-qbar__row">
          <strong>{p.title}</strong>
          <span className="u2-qbar__timer" role="timer" aria-live="off">{formatTimer(s.elapsed)}</span>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: s.phase === "running" ? "pause" : "resume" })}>{s.phase === "running" ? "Pause" : "Resume"}</Button>
          <Button size="sm" variant="ghost" onClick={confirmCancel}>← Cancel</Button>
          {s.mode !== "practice" ? (
            <Button size="sm" variant="primary" loading={p.submitting} className="u2-toolbar__new" onClick={() => { if (unanswered.length && !window.confirm(`${unanswered.length} question${unanswered.length === 1 ? " is" : "s are"} still unanswered. Submit anyway?`)) return; p.onSubmit(); }}>Submit quiz</Button>
          ) : (
            <Button size="sm" variant="primary" loading={p.submitting} className="u2-toolbar__new" onClick={p.onFinishPractice}>Done practicing</Button>
          )}
        </div>
        <nav className="u2-qstrip" aria-label="Questions">
          {items.map((it, i) => {
            const n = it.questionNumber;
            const answered = s.kind === "mcq" ? n in s.answers : !!(s.texts[n] ?? "").trim();
            return (
              <button key={n} type="button" aria-current={i === s.index} data-answered={answered} data-flagged={s.flags.includes(n)} aria-label={`Question ${n}${answered ? ", answered" : ""}${s.flags.includes(n) ? ", flagged" : ""}`} onClick={() => selectQuestion(i)}>{n}</button>
            );
          })}
        </nav>
      </div>

      {/* Not part of the fixed bar: on a phone the bar must stay small, or it covers the last question. */}
      <div className="u2-qopts">
        {/* TKT-0361: the "Show if I'm right after each question" switch is hidden for now. The code stays here; the quiz machine still supports it.
        {s.kind === "mcq" && s.mode !== "practice" && (
          <CheckField label="Show if I'm right after each question" checked={s.instantCheck} onChange={(on) => dispatch({ type: "instantCheck", on })} />
        )}
        */}
        <div className="u2-seg" role="group" aria-label="Question layout">
          <button type="button" className="u2-seg__btn" aria-pressed={page} data-on={page} onClick={() => chooseLayout(true)}>All on one page</button>
          <button type="button" className="u2-seg__btn" aria-pressed={!page} data-on={!page} onClick={() => chooseLayout(false)}>One at a time</button>
        </div>
        <PaperPdfLinks links={p.pdfLinks} showMs={practice} />
      </div>

      {page ? (
        <div className="u2-allq">
          {items.map((it, i) => {
            const n = it.questionNumber;
            return (
              <div key={n} id={`u2-q-${n}`} className="u2-allq__item" data-current={i === s.index}>
                {s.kind === "mcq"
                  ? <McqCard q={it as McqQuestion} state={s} dispatch={dispatch} checked={checked.has(n)} onCheck={() => setChecked((c) => new Set(c).add(n))} />
                  : <StructuredCard item={it as StructuredItem} state={s} dispatch={dispatch} status={p.grading[n]} onGrade={() => p.onGrade(n)} />}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {cur && s.kind === "mcq" && (
            <McqCard key={q} q={cur as McqQuestion} state={s} dispatch={dispatch} checked={checked.has(q)} onCheck={() => setChecked((c) => new Set(c).add(q))} />
          )}
          {cur && s.kind === "structured" && (
            <StructuredCard key={q} item={cur as StructuredItem} state={s} dispatch={dispatch} status={p.grading[q]} onGrade={() => p.onGrade(q)} />
          )}
          <div className="u2-rowactions">
            <Button variant="ghost" disabled={s.index === 0} onClick={() => selectQuestion(s.index - 1)}>← Previous</Button>
            <Button variant="ghost" disabled={s.index >= items.length - 1} onClick={() => selectQuestion(s.index + 1)}>Next →</Button>
          </div>
        </>
      )}
      {s.kind === "structured" && s.mode === "test" && (
        <details className="u2-box u2-box--inner">
          <summary>📐 Answering with a table or diagram? Click for the text template</summary>
          <pre style={{ whiteSpace: "pre-wrap", margin: "var(--u2-space-2) 0 0" }}>{DIAGRAM_HINT}</pre>
        </details>
      )}
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: "question" | "answer"; setTab: (t: "question" | "answer") => void }) {
  return (
    <div className="u2-tabs" role="tablist" aria-label="Question or answer">
      {(["question", "answer"] as const).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "question" ? "Question" : "Answer"}</button>
      ))}
    </div>
  );
}

function McqCard({ q, state: s, dispatch, checked, onCheck }: { q: McqQuestion; state: QuizState; dispatch: (a: QuizAction) => void; checked: boolean; onCheck: () => void }) {
  const [tab, setTab] = useState<"question" | "answer">("question");
  const practice = s.mode === "practice";
  const picked = s.answers[q.questionNumber];
  const flagged = s.flags.includes(q.questionNumber);
  const verdict = !q.correctAnswer ? "Not auto-gradable" : !picked ? "Select an answer first" : picked === q.correctAnswer ? "Correct" : `Incorrect (answer: ${q.correctAnswer})`;
  return (
    <article className="u2-qcard" aria-label={`Question ${q.questionNumber}`}>
      <div className="u2-rowactions">
        <strong>Question {q.questionNumber}</strong>
        {!practice && (
          <label className="u2-check u2-push">
            <input type="checkbox" checked={flagged} onChange={() => dispatch({ type: "flag", q: q.questionNumber })} /> 🚩 Flag to come back to this one
          </label>
        )}
      </div>
      {practice && <TabBar tab={tab} setTab={setTab} />}
      {(!practice || tab === "question") && (
        // eslint-disable-next-line @next/next/no-img-element -- the image is a data URL made by the solver service
        <img src={q.image} alt={`Question ${q.questionNumber}`} loading="lazy" />
      )}
      {practice && tab === "answer" && (q.correctAnswer ? <p>Correct answer: <strong className="u2-verdict u2-verdict--correct">{q.correctAnswer}</strong></p> : <p className="u2-muted">No clear-cut answer was found in the mark scheme for this question.</p>)}
      {!practice && !q.correctAnswer && <p className="u2-warnbox">This question&apos;s mark scheme wasn&apos;t clear-cut enough to auto-grade. Answer it if you like, but it won&apos;t count toward your score.</p>}
      {!practice && (
        <>
          <div className="u2-letters" role="radiogroup" aria-label={`Answer for question ${q.questionNumber}`}>
            {q.optionLetters.map((l) => (
              <label key={l}>
                <input type="radio" name={`q${q.questionNumber}`} value={l} checked={picked === l} onChange={() => dispatch({ type: "answer", q: q.questionNumber, letter: l })} />
                {l}
              </label>
            ))}
          </div>
          {s.instantCheck && (
            <div className="u2-rowactions">
              <Button size="sm" variant="ghost" onClick={onCheck}>Check answer</Button>
              {checked && <span role="status" className={`u2-verdict ${picked && picked === q.correctAnswer ? "u2-verdict--correct" : picked && q.correctAnswer ? "u2-verdict--incorrect" : ""}`}>{verdict}</span>}
            </div>
          )}
        </>
      )}
    </article>
  );
}

function StructuredCard({ item, state: s, dispatch, status, onGrade }: { item: StructuredItem; state: QuizState; dispatch: (a: QuizAction) => void; status?: GradingStatus; onGrade: () => void }) {
  const [tab, setTab] = useState<"question" | "answer">("question");
  const practice = s.mode === "practice";
  const n = item.questionNumber;
  const text = s.texts[n] ?? "";
  const label = !status || status.state === "idle" ? "Not submitted yet" : status.state === "grading" ? `Grading… ${status.seconds ?? 0}s` : status.state === "done" ? "Submitted ✓ You can still edit and resubmit" : status.state === "stale" ? "Answer changed since last submit. Submit again." : `Couldn't submit: ${status.message}. Try again.`;
  return (
    <article className="u2-qcard" aria-label={`Question ${n}`}>
      <strong>Question {n}</strong>
      {practice && <TabBar tab={tab} setTab={setTab} />}
      {(!practice || tab === "question") && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service
        <img src={item.qImage} alt={`Question ${n}`} loading="lazy" />
      )}
      {practice && tab === "answer" && (item.msImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service
        <img src={item.msImage} alt={`Mark scheme for question ${n}`} />
      ) : <p className="u2-muted">No mark scheme was found for this question.</p>)}
      {!practice && (
        <>
          <TextArea rows={8} aria-label={`Your answer to question ${n}`} placeholder="Write your full working here, step by step... (needs a table or diagram? see the template below)" value={text} onChange={(e) => dispatch({ type: "text", q: n, text: e.target.value })} />
          <div className="u2-rowactions">
            <Button variant="primary" loading={status?.state === "grading"} disabled={!text.trim()} disabledReason="Write your answer first." onClick={onGrade}>Submit answer</Button>
            <span className={status?.state === "error" ? "u2-form__error" : "u2-muted"} role="status">{label}</span>
          </div>
        </>
      )}
    </article>
  );
}

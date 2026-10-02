"use client";

import { Button } from "@/ui2/components/Button";
import { Feedback } from "./Feedback";
import { isFullMarks, type McqResult } from "./solverLogic";
import type { GradeResult } from "./solverTypes";
import "./solver.css";

export type Results =
  | { kind: "mcq"; results: McqResult[]; correct: number; gradable: number }
  | { kind: "structured"; graded: GradeResult[]; correct: number; gradable: number };

/** The banner with the score, then one compact row per question. A question counts only when it is right (MCQ) or has full marks (written). */
export function ResultsStage({ results, saveStatus, canOpenProgress, onProgress, onBack, backLabel }: { results: Results; saveStatus: string; canOpenProgress: boolean; onProgress: () => void; onBack: () => void; backLabel: string }) {
  const empty = results.kind === "structured" && results.gradable === 0;
  return (
    <div className="u2-solver">
      <div className="u2-banner" role="status">
        <span>Score</span>
        <span className="u2-banner__big">{empty ? "No questions attempted" : `${results.correct} / ${results.gradable}`}</span>
      </div>
      {results.kind === "structured" && <p className="u2-muted">A question only counts as correct if it scored full marks. The score on each one shows how close a partial answer got.</p>}
      <div className="u2-review" aria-label="Review">
        {results.kind === "mcq"
          ? results.results.map((r) => (
              <div key={r.questionNumber} className={`u2-review__row u2-review__row--${r.verdict === "correct" ? "correct" : r.verdict === "incorrect" ? "incorrect" : "other"}`}>
                <strong>Q{r.questionNumber}</strong>
                <span className={`u2-verdict ${r.verdict === "correct" ? "u2-verdict--correct" : r.verdict === "incorrect" ? "u2-verdict--incorrect" : ""}`}>
                  {r.verdict === "correct" ? "Correct" : r.verdict === "incorrect" ? "Incorrect" : r.verdict === "unanswered" ? "Unanswered" : "Not auto-gradable"}
                  {r.flagged ? " 🚩" : ""}
                </span>
                <span>
                  Your answer: {r.studentAnswer ?? "(none selected)"}
                  {r.verdict !== "correct" && r.correctAnswer ? <> · <strong>Correct answer:</strong> {r.correctAnswer}</> : null}
                </span>
              </div>
            ))
          : results.graded.length === 0 ? <p className="u2-muted">You didn&apos;t submit an answer for any question.</p> : results.graded.map((g) => (
              <div key={g.questionNumber} className={`u2-review__row u2-review__row--${g.ungradable ? "other" : isFullMarks(g) ? "correct" : "incorrect"}`}>
                <strong>Q{g.questionNumber}</strong>
                <span className={`u2-verdict ${isFullMarks(g) ? "u2-verdict--correct" : g.ungradable ? "" : "u2-verdict--incorrect"}`}>{g.ungradable ? "Not auto-gradable" : isFullMarks(g) ? "Correct" : "Incorrect"}</span>
                <div>
                  {g.ungradable ? <span className="u2-muted">{g.reason}</span> : <span>Scored <strong>{g.marksAwarded} / {g.marksAvailable}</strong>{g.remark ? `. ${g.remark}` : ""}</span>}
                  {!g.ungradable && <Feedback answer={g.studentAnswerVerbatim} lineFeedback={g.lineFeedback} markBreakdown={g.markBreakdown} styleChecklist={g.styleChecklist} fullMarkAnswer={g.fullMarkAnswer} />}
                </div>
              </div>
            ))}
      </div>
      {saveStatus && <p className="u2-muted" role="status">{saveStatus}</p>}
      <div className="u2-rowactions">
        <Button variant="ghost" onClick={onBack}>{backLabel}</Button>
        {canOpenProgress && <Button variant="ghost" onClick={onProgress}>View my progress &amp; the leaderboard</Button>}
      </div>
    </div>
  );
}

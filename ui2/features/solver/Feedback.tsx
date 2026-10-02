import type { LineFeedback, MarkBreakdown, StyleItem } from "./solverTypes";
import "./solver.css";

/** The grader's detail for one written answer: the student's own words, step by step feedback, marks one by one, question-type devices, and a model answer. */
export function Feedback({ answer, lineFeedback, markBreakdown, styleChecklist, fullMarkAnswer, correctAnswer }: { answer?: string; lineFeedback?: LineFeedback[]; markBreakdown?: MarkBreakdown[]; styleChecklist?: StyleItem[]; fullMarkAnswer?: string; correctAnswer?: string }) {
  return (
    <div className="u2-feedback">
      {answer && (
        <>
          <strong>Your answer</strong>
          <div className="u2-verbatim">{answer}</div>
        </>
      )}
      {correctAnswer && correctAnswer !== answer && <div className="u2-verdict u2-verdict--correct">✓ Correct answer: {correctAnswer}</div>}
      {Array.isArray(lineFeedback) && lineFeedback.length > 0 && (
        <div className="u2-feedback">
          {lineFeedback.map((lf, i) => (
            <div key={i} className={`u2-feedback__step${lf.correct ? "" : " u2-feedback__step--bad"}`}>
              <div>{lf.step}</div>
              {!lf.correct && (
                <>
                  <div className="u2-verdict u2-verdict--incorrect">✗ {lf.mistake}</div>
                  <div className="u2-verdict u2-verdict--correct">✓ Correct: {lf.correctAlternative}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {Array.isArray(markBreakdown) && markBreakdown.length > 0 && (
        <>
          <strong>Mark-by-mark breakdown</strong>
          {markBreakdown.map((m, i) => (
            <div key={i} className={`u2-feedback__step${m.awarded ? "" : " u2-feedback__step--bad"}`}>
              <span className="u2-strong">{m.markLabel || "Mark"}</span>{" "}
              <span className={`u2-verdict ${m.awarded ? "u2-verdict--correct" : "u2-verdict--incorrect"}`}>{m.awarded ? "✓ Awarded" : "✗ Not awarded"}</span>
              {m.awarded && m.evidence && <div>From your answer: {m.evidence}</div>}
              {!m.awarded && m.whatWasNeeded && <div>Needed: {m.whatWasNeeded}</div>}
            </div>
          ))}
        </>
      )}
      {Array.isArray(styleChecklist) && styleChecklist.length > 0 && (
        <>
          <strong>Question type feedback</strong>
          {styleChecklist.map((s, i) => (
            <div key={i} className={`u2-feedback__step${s.present ? "" : " u2-feedback__step--bad"}`}>
              <span className="u2-strong">{s.device || ""}</span>{" "}
              <span className={`u2-verdict ${s.present ? "u2-verdict--correct" : "u2-verdict--incorrect"}`}>{s.present ? "✓ Used" : "✗ Not seen"}</span>
              {s.present && s.evidence && <div>From your answer: {s.evidence}</div>}
            </div>
          ))}
        </>
      )}
      {fullMarkAnswer && (
        <>
          <strong>What a full-mark answer looks like</strong>
          <div className="u2-verbatim">{fullMarkAnswer}</div>
        </>
      )}
    </div>
  );
}

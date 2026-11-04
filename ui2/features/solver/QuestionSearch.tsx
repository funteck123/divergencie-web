"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Field, TextInput } from "@/ui2/components/Field";
import { searchQuestions } from "@/ui2/queries/solver";
import { MIN_SEARCH_LENGTH, hitToPick, searchQueryOf } from "./solverLogic";
import type { SearchHit } from "./solverTypes";
import type { PickedPaper } from "./LibraryStage";
import "./solver.css";

const WAIT_MS = 300; // after the last key press

/**
 * Find a question by its wording and open the paper it is in (TKT-0237). The server limits hits to the subjects this account may see.
 * Every key press restarts a short timer, and an answer that arrives after a newer search was sent is dropped, so slow replies never overwrite fresh ones.
 */
export function QuestionSearch({ busy, onPick }: { busy: boolean; onPick: (p: PickedPaper, component: string) => void }) {
  const [raw, setRaw] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const latest = useRef(0);
  const q = searchQueryOf(raw);

  useEffect(() => {
    const run = ++latest.current;
    if (q.length < MIN_SEARCH_LENGTH) {
      setHits(null); setState("idle"); // eslint-disable-line react-hooks/set-state-in-effect -- clearing results when the box is emptied
      return;
    }
    setState("loading");
    const timer = window.setTimeout(() => {
      searchQuestions(q).then(
        (r) => { if (run === latest.current) { setHits(r.results); setState("idle"); } },
        () => { if (run === latest.current) { setHits(null); setState("error"); } },
      );
    }, WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [q]);

  function open(h: SearchHit) {
    const pick = hitToPick(h);
    if (pick) onPick({ source: "topical", paper: pick.paper, structured: pick.structured, meta: pick.meta }, pick.component);
  }

  return (
    <div className="u2-qsearch">
      <Field label="Search questions" hint="Type words from a question, for example upper bound area. Opens the whole worksheet.">
        <TextInput type="search" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Words from the question" autoComplete="off" />
      </Field>
      {state === "loading" && <p className="u2-muted" role="status">Searching…</p>}
      {state === "error" && <p role="alert" className="u2-errorbox">Search is unavailable right now. Try again in a moment, or choose a paper below.</p>}
      {state === "idle" && hits && hits.length === 0 && <p className="u2-muted" role="status">No question has all of those words. Try fewer or shorter words.</p>}
      {hits && hits.length > 0 && (
        <ul className="u2-hits" aria-label={`${hits.length} matching questions`}>
          {hits.map((h) => (
            <li key={`${h.qpId}:${h.questionNumber}`} className="u2-hit">
              <div className="u2-hit__text">
                <p className="u2-hit__where">{h.board} {h.subject} · {h.component}</p>
                <p className="u2-hit__title">{h.title} · Question {h.questionNumber}</p>
                <p className="u2-hit__snippet">{h.snippet}</p>
              </div>
              <Button size="sm" variant="secondary" disabled={busy || !h.msId} disabledReason={h.msId ? "Loading a paper." : "This paper has no mark scheme."} onClick={() => open(h)}>Open paper</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

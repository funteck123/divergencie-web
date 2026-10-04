"use client";

import { useMemo, useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { Field } from "@/ui2/components/Field";
import type { LibraryBundle } from "@/ui2/queries/solver";
import { yearlyPdfUrl } from "@/ui2/queries/solver";
import { boardsOf, chapterKey, componentsOf, fetchButtonLabel, isReadingComponent, isStructuredComponent, paperTypes, sessionsOf, subjectsOf, yearlyPaperLabel, yearsOf, type PaperType } from "./solverLogic";
import type { AttemptMeta, TopicalPaper, YearlyPaper } from "./solverTypes";
import "./solver.css";

export type PickedPaper =
  | { source: "topical"; paper: TopicalPaper; structured: boolean; meta: AttemptMeta }
  | { source: "yearly"; paper: YearlyPaper; structured: boolean; meta: AttemptMeta };

const opt = (v: string): ComboOption => ({ value: v, label: v });

/**
 * Pick board, subject, component, paper type, (year and session for yearly papers) and paper, all in one column, with the
 * button that loads the paper pinned to the bottom of the screen on a phone. Reading-only components open a PDF instead.
 */
export function LibraryStage({ bundle, loading, error, canMistakes, busy, status, onPick, onMistakes, onUpload, onProgress }: {
  bundle: LibraryBundle | undefined;
  loading: boolean;
  error: string;
  canMistakes: boolean;
  busy: boolean;
  status: string;
  onPick: (p: PickedPaper, component: string) => void;
  onMistakes: (board: string, subject: string, component: string) => void;
  onUpload: () => void;
  onProgress: () => void;
}) {
  const lib = useMemo(() => bundle?.library ?? {}, [bundle]);
  const yearly = useMemo(() => bundle?.yearly ?? {}, [bundle]);
  const [board, setBoard] = useState("");
  const [subject, setSubject] = useState("");
  const [component, setComponent] = useState("");
  const [typeChoice, setTypeChoice] = useState<PaperType | "">("");
  const [year, setYear] = useState("");
  const [session, setSession] = useState("");
  const [paperKey, setPaperKey] = useState("");

  // Every choice falls back to the first valid one, so the picker is always in a usable state (derived, not stored).
  const boards = boardsOf(lib, yearly);
  const b = boards.includes(board) ? board : (boards[0] ?? "");
  const subjects = subjectsOf(lib, yearly, b);
  const s = subjects.includes(subject) ? subject : (subjects[0] ?? "");
  const components = componentsOf(lib, yearly, b, s);
  const c = components.includes(component) ? component : (components[0] ?? "");
  const topical = lib[b]?.[s]?.[c] ?? [];
  const yearlyPapers = yearly[b]?.[s]?.[c] ?? [];
  const types = paperTypes(topical, yearlyPapers);
  const type: PaperType = typeChoice && types.options.includes(typeChoice) ? typeChoice : types.value;
  const reading = type === "yearly" && yearlyPapers.length > 0 && isReadingComponent(c);
  const years = yearsOf(yearlyPapers).map(String);
  const y = years.includes(year) ? year : (years[0] ?? "");
  const sessions = sessionsOf(yearlyPapers, Number(y));
  const se = sessions.includes(session) ? session : (sessions[0] ?? "");

  const paperOptions: ComboOption[] =
    type === "topical"
      ? topical.map((p, i) => ({ value: String(i), label: `${p.title}${p.msId ? "" : " (no mark scheme found)"}` }))
      : reading
        ? yearlyPapers.map((p) => ({ value: p.paperId, label: p.title }))
        : yearlyPapers.filter((p) => p.year === Number(y) && p.session === se).map((p) => ({ value: p.paperId, label: yearlyPaperLabel(p) }));
  const pk = paperOptions.some((o) => o.value === paperKey) ? paperKey : (paperOptions[0]?.value ?? "");
  const topicalPaper = type === "topical" ? topical[Number(pk)] : undefined;
  const missingMs = type === "topical" && !!topicalPaper && !topicalPaper.msId;
  const structured = isStructuredComponent(bundle?.meta ?? {}, b, s, c);
  const disabled = busy || !pk || missingMs;

  function go() {
    if (type === "yearly") {
      const paper = yearlyPapers.find((p) => p.paperId === pk);
      if (!paper) return;
      if (reading) return void window.open(yearlyPdfUrl(paper.paperId), "_blank");
      onPick({ source: "yearly", paper, structured, meta: { subject: `${b} ${s}`, chapter: null, paperId: paper.paperId } }, c);
      return;
    }
    if (!topicalPaper?.msId) return;
    onPick({ source: "topical", paper: topicalPaper, structured, meta: { subject: `${b} ${s}`, chapter: chapterKey(topicalPaper.title), paperId: topicalPaper.qpId } }, c);
  }

  if (loading) return <div className="u2-skeleton" style={{ height: 260 }} aria-busy="true" aria-label="Loading the library" />;
  if (error && !bundle) return <p role="alert" className="u2-errorbox">Library unavailable: {error}</p>;

  return (
    <section className="u2-solver-picker" aria-label="Choose a paper from the library">
      <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Choose a paper from the library</h2>
      <Field label="Board"><Combobox value={b} onChange={setBoard} options={boards.map(opt)} /></Field>
      <Field label="Subject"><Combobox value={s} onChange={setSubject} options={subjects.map(opt)} /></Field>
      <Field label="Component">
        <div className="u2-inline" style={{ alignItems: "stretch" }}>
          <div style={{ flex: 1 }}><Combobox value={c} onChange={setComponent} options={components.map(opt)} /></div>
          {canMistakes && type === "topical" && topical.length > 0 && <Button variant="ghost" onClick={() => onMistakes(b, s, c)}>Mistakes Mode</Button>}
        </div>
      </Field>
      {types.show && (
        <Field label="Paper Type">
          <Combobox value={type} onChange={(v) => setTypeChoice(v as PaperType)} options={[{ value: "topical", label: "Topical worksheets" }, { value: "yearly", label: "Yearly past papers" }]} />
        </Field>
      )}
      {type === "yearly" && !reading && yearlyPapers.length > 0 && (
        <div className="u2-grid2">
          <Field label="Year"><Combobox value={y} onChange={setYear} options={years.map(opt)} /></Field>
          <Field label="Session"><Combobox value={se} onChange={setSession} options={sessions.map(opt)} /></Field>
        </div>
      )}
      <Field label="Paper" hint={missingMs ? "No matching mark scheme was found in the library for this paper. It can't be auto-graded." : undefined}>
        <Combobox value={pk} onChange={setPaperKey} options={paperOptions} />
      </Field>
      {status && <p className="u2-muted" role="status">{status}</p>}
      {error && bundle && <p role="alert" className="u2-errorbox">{error} Your choices are kept. Press the button again to retry.</p>}
      <div className="u2-solver-picker__go">
        <Button variant="primary" loading={busy} disabled={disabled} disabledReason={missingMs ? "This paper has no mark scheme." : "Choose a paper first."} onClick={go}>{fetchButtonLabel(c)}</Button>
      </div>
      <p className="u2-muted" style={{ margin: 0 }}>
        <Button size="sm" variant="ghost" onClick={onUpload}>Or upload your own QP + MS PDFs instead</Button>
        {" · "}
        <Button size="sm" variant="ghost" onClick={onProgress}>View my progress &amp; the leaderboard</Button>
      </p>
    </section>
  );
}

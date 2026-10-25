"use client";

import { Skeleton } from "@/ui2/components/Skeleton";
import { useMemo, useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { Field } from "@/ui2/components/Field";
import type { LibraryBundle } from "@/ui2/queries/solver";
import { solvedPdfUrl, yearlyPdfUrl } from "@/ui2/queries/solver";
import { boardsOf, chapterKey, chapterOf, componentsOf, fetchButtonLabel, isReadingComponent, isStructuredComponent, PAPER_TYPE_LABEL, paperTypeChoices, sessionsOf, subjectHasTypes, subjectsOf, topicalChapters, yearlyPaperLabel, yearsOf, type PaperType } from "./solverLogic";
import { NEW_PAPER, isGoodPick, pickHint, statusLabel, type PaperStatus } from "./progressLogic";
import type { AttemptMeta, TopicalPaper, YearlyPaper } from "./solverTypes";
import "./solver.css";

export type PickedPaper =
  | { source: "topical"; paper: TopicalPaper; structured: boolean; meta: AttemptMeta }
  | { source: "yearly"; paper: YearlyPaper; structured: boolean; meta: AttemptMeta };

const OTHER_CHAPTER = "~"; // worksheets whose title has no chapter number
const opt = (v: string): ComboOption => ({ value: v, label: v });

/**
 * Pick board, subject, component, paper type, (year and session for yearly papers) and paper, all in one column, with the
 * button that loads the paper pinned to the bottom of the screen on a phone. Reading-only components open a PDF instead.
 */
export function LibraryStage({ bundle, loading, error, canMistakes, busy, status, statuses, onPick, onMistakes, onUpload, onProgress }: {
  bundle: LibraryBundle | undefined;
  loading: boolean;
  error: string;
  canMistakes: boolean;
  busy: boolean;
  status: string;
  /** paperId to what the student has done on it. A paper missing here has not been tried. */
  statuses: Record<string, PaperStatus>;
  onPick: (p: PickedPaper, component: string) => void;
  onMistakes: (board: string, subject: string, component: string) => void;
  onUpload: () => void;
  onProgress: () => void;
}) {
  const lib = useMemo(() => bundle?.library ?? {}, [bundle]);
  const yearly = useMemo(() => bundle?.yearly ?? {}, [bundle]);
  const solved = useMemo(() => bundle?.solved ?? {}, [bundle]);
  const [board, setBoard] = useState("");
  const [subject, setSubject] = useState("");
  const [component, setComponent] = useState("");
  const [typeChoice, setTypeChoice] = useState<PaperType | "">("");
  const [year, setYear] = useState("");
  const [session, setSession] = useState("");
  const [paperKey, setPaperKey] = useState("");
  const [chapterPick, setChapterPick] = useState("");

  // Every choice falls back to the first valid one, so the picker is always in a usable state (derived, not stored).
  const boards = boardsOf(lib, yearly, solved);
  const b = boards.includes(board) ? board : (boards[0] ?? "");
  const subjects = subjectsOf(lib, yearly, b, solved);
  const s = subjects.includes(subject) ? subject : (subjects[0] ?? "");
  const components = componentsOf(lib, yearly, b, s, solved);
  const c = components.includes(component) ? component : (components[0] ?? "");
  const topical = lib[b]?.[s]?.[c] ?? [];
  const yearlyPapers = yearly[b]?.[s]?.[c] ?? [];
  const solvedItems = solved[b]?.[s]?.[c] ?? [];
  // The Topical, Yearly or Solved choice shows whenever the subject has more than one kind somewhere; it starts on a kind this component has.
  const here = { topical: topical.length, yearly: yearlyPapers.length, solved: solvedItems.length };
  const types = paperTypeChoices(here, subjectHasTypes(lib, yearly, solved, b, s));
  const type: PaperType = typeChoice && types.options.includes(typeChoice) ? typeChoice : types.value;
  const reading = type === "yearly" && yearlyPapers.length > 0 && isReadingComponent(c);
  const years = yearsOf(yearlyPapers).map(String);
  const y = years.includes(year) ? year : (years[0] ?? "");
  const sessions = sessionsOf(yearlyPapers, Number(y));
  const se = sessions.includes(session) ? session : (sessions[0] ?? "");

  const chapters = type === "topical" ? topicalChapters(topical) : [];
  const solvedIn = (key: string) => topical.filter((p) => (chapterOf(p.title) ?? OTHER_CHAPTER) === key && !isGoodPick(stateOf(p.qpId))).length;
  const chap = chapters.some((c) => c.key === chapterPick) ? chapterPick : "";
  const stateOf = (id: string) => statuses[id] ?? NEW_PAPER;
  const tag = (id: string) => ` · ${statusLabel(stateOf(id))}`;
  const paperOptions: ComboOption[] =
    type === "solved"
      ? solvedItems.map((i) => ({ value: i.solvedId, label: `${i.title} · ${i.kind} · ${i.pages} pages` }))
      : type === "topical"
      ? topical.map((p, i) => ({ p, i })).filter(({ p }) => !chap || (chapterOf(p.title) ?? OTHER_CHAPTER) === chap).map(({ p, i }) => ({ value: String(i), label: `${p.title}${p.msId ? "" : " (no mark scheme found)"}${tag(p.qpId)}` }))
      : reading
        ? yearlyPapers.map((p) => ({ value: p.paperId, label: p.title }))
        : yearlyPapers.filter((p) => p.year === Number(y) && p.session === se).map((p) => ({ value: p.paperId, label: `${yearlyPaperLabel(p)}${tag(p.paperId)}` }));
  const pk = paperOptions.some((o) => o.value === paperKey) ? paperKey : (paperOptions[0]?.value ?? "");
  const topicalPaper = type === "topical" ? topical[Number(pk)] : undefined;
  const missingMs = type === "topical" && !!topicalPaper && !topicalPaper.msId;
  const structured = isStructuredComponent(bundle?.meta ?? {}, b, s, c);
  const picked = stateOf(type === "topical" ? (topicalPaper?.qpId ?? "") : pk);
  const hintWord = pickHint(picked);
  const pickNote = !pk || reading || type === "solved" ? undefined : `${statusLabel(picked)}${picked.tests ? `, ${picked.tests} ${picked.tests === 1 ? "test" : "tests"}` : ""}${hintWord ? `. ${hintWord[0]?.toUpperCase()}${hintWord.slice(1)}.` : "."}`;
  const disabled = busy || !pk || missingMs;
  // An empty list says what this component does have, so a component without topical worksheets is not a dead end.
  const elsewhere = types.options.filter((t) => t !== type && here[t] > 0).map((t) => PAPER_TYPE_LABEL[t]);
  const emptyNote = `No ${PAPER_TYPE_LABEL[type].toLowerCase()} for this component yet.${elsewhere.length ? ` It has ${elsewhere.join(" and ")}: switch Paper Type to see them.` : ""}`;

  function go() {
    if (type === "solved") return void (pk && window.open(solvedPdfUrl(pk), "_blank")); // a document to read: no quiz, no score
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

  if (loading) return <Skeleton height={260} label="Loading the library" />;
  if (error && !bundle) return <p role="alert" className="u2-errorbox">Library unavailable: {error}</p>;

  return (
    <section className="u2-solver-picker" aria-label="Choose a paper from the library">
      <h2>Choose a paper from the library</h2>
      <Field label="Board"><Combobox value={b} onChange={(v) => { setBoard(v); setTypeChoice(""); }} options={boards.map(opt)} /></Field>
      <Field label="Subject"><Combobox value={s} onChange={(v) => { setSubject(v); setTypeChoice(""); }} options={subjects.map(opt)} /></Field>
      <Field label="Component">
        <div className="u2-inline u2-inline--stretch">
          <div className="u2-grow"><Combobox value={c} onChange={(v) => { setComponent(v); setTypeChoice(""); }} options={components.map(opt)} /></div>
          {canMistakes && type === "topical" && topical.length > 0 && <Button variant="ghost" onClick={() => onMistakes(b, s, c)}>Mistakes Mode</Button>}
        </div>
      </Field>
      {types.show && (
        <Field label="Paper Type">
          <Combobox value={type} onChange={(v) => setTypeChoice(v as PaperType)} options={types.options.map((t) => ({ value: t, label: PAPER_TYPE_LABEL[t] }))} />
        </Field>
      )}
      {type === "yearly" && !reading && yearlyPapers.length > 0 && (
        <div className="u2-grid2">
          <Field label="Year"><Combobox value={y} onChange={setYear} options={years.map(opt)} /></Field>
          <Field label="Session"><Combobox value={se} onChange={setSession} options={sessions.map(opt)} /></Field>
        </div>
      )}
      {type === "topical" && chapters.length > 1 && (
        <Field label="Chapter" hint={`${chapters.length} chapters. Leave on All chapters to see every worksheet.`}>
          <Combobox value={chap} onChange={(v) => { setChapterPick(v); setPaperKey(""); }} placeholder="All chapters" options={chapters.map((c) => ({ value: c.key, label: `${c.label} (${solvedIn(c.key)} of ${c.count} solved)` }))} />
        </Field>
      )}
      {paperOptions.length === 0 && <p className="u2-muted" role="status">{emptyNote}</p>}
      <Field label="Paper" hint={missingMs ? "No matching mark scheme was found in the library for this paper. It can't be auto-graded." : type === "solved" ? "Opens as a PDF in a new tab. Solved papers are not marked or tracked." : pickNote}>
        <Combobox value={pk} onChange={setPaperKey} options={paperOptions} />
      </Field>
      {status && <p className="u2-muted" role="status">{status}</p>}
      {error && bundle && <p role="alert" className="u2-errorbox">{error} Your choices are kept. Press the button again to retry.</p>}
      <div className="u2-solver-picker__go">
        <Button variant="primary" loading={busy} disabled={disabled} disabledReason={missingMs ? "This paper has no mark scheme." : "Choose a paper first."} onClick={go}>{type === "solved" ? "Open solved paper" : fetchButtonLabel(c)}</Button>
      </div>
      <div className="u2-cluster">
        <Button size="sm" variant="ghost" onClick={onUpload}>Or upload your own QP + MS PDFs instead</Button>
        <Button size="sm" variant="ghost" onClick={onProgress}>View my progress &amp; the leaderboard</Button>
      </div>
    </section>
  );
}

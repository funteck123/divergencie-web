"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Field } from "@/ui2/components/Field";
import { getQuestionImage, getQuestionResponses, loadProgress } from "@/ui2/queries/solver";
import { BarChart, LineChart, type Series } from "./Charts";
import { Feedback } from "./Feedback";
import { attemptMatches, chapterLabel, historyRows, naturalQuestionSort, pctOf, seriesByAccount, type HistoryRow } from "./solverLogic";
import type { AttemptRow, Leaderboard, RankEntry } from "./solverTypes";
import "./solver.css";

type Tab = "progress" | "history" | "mistakes" | "leaderboard";
const TABS: { id: Tab; label: string }[] = [{ id: "progress", label: "Progress" }, { id: "history", label: "History" }, { id: "mistakes", label: "Mistakes" }, { id: "leaderboard", label: "Leaderboard" }];
const opts = (list: readonly string[], label?: (s: string) => string) => list.map((v) => ({ value: v, label: label ? label(v) : v }));

/** Four tabs: score over time (own line bold, others faint), every attempt with its saved answers, mistakes per chapter, and the leaderboards. A summary strip sits on top. */
export function ProgressStage({ account, titles, names, onBack }: { account: string; titles: Record<string, string>; names: Record<string, string>; onBack: () => void }) {
  const q = useQuery({ queryKey: ["solver-progress", account] as const, queryFn: () => loadProgress(account) });
  const [tab, setTab] = useState<Tab>("progress");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [mistakeSubject, setMistakeSubject] = useState("");
  const data = q.data;
  const label = (subj: string, ch: string | null) => chapterLabel(names, subj, ch);
  const titleOf = (id: string) => titles[id] || id;

  const mine = useMemo(() => data?.mine ?? [], [data]);
  const subjects = useMemo(() => [...new Set(mine.map((a) => a.subject))], [mine]);
  const chapters = useMemo(() => (subject ? [...new Set(mine.filter((a) => a.subject === subject).map((a) => a.chapter).filter((c): c is string => !!c))] : []), [mine, subject]);
  const scope = { subject, chapter };
  const scoped = useMemo(() => mine.filter((a) => attemptMatches(a, scope)), [mine, subject, chapter]); // eslint-disable-line react-hooks/exhaustive-deps
  const lines = useMemo(() => {
    const { mine: m, others } = seriesByAccount(data?.all ?? [], scope, account);
    const toSeries = (id: string, labelText: string, rows: AttemptRow[], emphasis = false): Series => ({
      id, label: labelText, emphasis,
      points: rows.map((a) => ({ x: a.submitted_at ? new Date(a.submitted_at).getTime() : 0, y: pctOf(a), label: `${titleOf(a.paper_id)}: ${a.score}/${a.total_questions} (${Math.round(pctOf(a))}%)` })),
    });
    return [toSeries("me", "You", m, true), ...Object.entries(others).map(([id, rows]) => toSeries(id, "Another student", rows))];
  }, [data, subject, chapter, account, titles]); // eslint-disable-line react-hooks/exhaustive-deps

  const completed = mine.filter((a) => a.mode !== "practice" && a.score != null);
  const avg = completed.length ? Math.round(completed.reduce((t, a) => t + pctOf(a), 0) / completed.length) : null;
  const rank = data?.leaderboard.overall.findIndex((e) => e.accountId === account) ?? -1;

  if (q.isPending) return <div className="u2-skeleton" style={{ height: 320 }} aria-busy="true" />;
  if (q.error) return <p role="alert" className="u2-errorbox">Couldn&apos;t load progress and leaderboard data ({q.error.message}). <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>Try again</Button></p>;

  return (
    <div className="u2-solver">
      <div className="u2-rowactions"><Button variant="ghost" onClick={onBack}>← Back to library</Button></div>
      <div className="u2-strip" aria-label="Summary">
        <div><strong>{mine.length}</strong><span>Attempts</span></div>
        <div><strong>{completed.length}</strong><span>Tests scored</span></div>
        <div><strong>{avg == null ? "—" : `${avg}%`}</strong><span>Average</span></div>
        <div><strong>{rank >= 0 ? `#${rank + 1}` : "—"}</strong><span>Rank by volume</span></div>
      </div>
      <div className="u2-tabs" role="tablist" aria-label="Progress sections">
        {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {(tab === "progress" || tab === "history") && (
        <div className="u2-grid2">
          <Field label="Subject"><Combobox value={subject} onChange={(v) => { setSubject(v); setChapter(""); }} placeholder="All subjects" options={opts(subjects)} /></Field>
          <Field label="Chapter"><Combobox value={chapter} onChange={setChapter} placeholder="All chapters" disabled={!subject} options={opts(chapters, (c) => label(subject, c))} /></Field>
        </div>
      )}
      {tab === "progress" && <LineChart series={lines} emptyText="No attempts recorded yet. Take a Test-mode quiz from the library to start tracking." />}
      {tab === "history" && <History rows={historyRows(scoped, label)} account={account} attempts={scoped} titleOf={titleOf} />}
      {tab === "mistakes" && <Mistakes chart={data?.mistakeChart ?? {}} subject={mistakeSubject} setSubject={setMistakeSubject} label={label} />}
      {tab === "leaderboard" && data && <Board lb={data.leaderboard} account={account} titles={titles} attempts={data.all} names={names} />}
    </div>
  );
}

function History({ rows, account, attempts, titleOf }: { rows: HistoryRow[]; account: string; attempts: AttemptRow[]; titleOf: (id: string) => string }) {
  const [open, setOpen] = useState<string | null>(null);
  const cols: Column<HistoryRow>[] = [
    { id: "paper", header: "Paper", tip: (r) => titleOf(r.paperId), cell: (r) => titleOf(r.paperId) },
    { id: "mode", header: "Mode", width: 70, cell: (r) => r.mode },
    { id: "chapter", header: "Chapter", width: 150, tip: (r) => r.chapter, cell: (r) => r.chapter },
    { id: "score", header: "Score", width: 70, numeric: true, cell: (r) => r.score },
    { id: "pct", header: "%", width: 56, numeric: true, cell: (r) => r.percent },
    { id: "time", header: "Time", width: 60, numeric: true, cell: (r) => r.time },
    { id: "when", header: "When", width: 150, cell: (r) => r.when },
    { id: "view", header: "Answers", width: 80, cell: (r) => (r.canView ? <Button size="sm" variant="ghost" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : (r.id as string))}>{open === r.id ? "Hide" : "View"}</Button> : "—") },
  ];
  const openRow = rows.find((r) => r.id === open);
  return (
    <>
      <DataTable caption="Attempt history" rows={rows} columns={cols} rowKey={(r) => `${r.id ?? r.paperId}-${r.when}`} emptyText="No attempts yet." />
      {openRow && <Answers account={account} attemptId={open as string} paperId={openRow.paperId} count={attempts.length} />}
    </>
  );
}

function Answers({ account, attemptId, paperId }: { account: string; attemptId: string; paperId: string; count: number }) {
  const q = useQuery({ queryKey: ["solver-responses", account, attemptId] as const, queryFn: () => getQuestionResponses(account, attemptId) });
  const [images, setImages] = useState<Record<string, string | "loading" | "error">>({});
  async function show(qn: string, kind: "qp" | "ms") {
    const key = `${qn}:${kind}`;
    if (images[key] && images[key] !== "error") return setImages((p) => { const { [key]: _x, ...rest } = p; return rest; });
    setImages((p) => ({ ...p, [key]: "loading" }));
    try {
      setImages((p) => ({ ...p, [key]: "" }));
      const r = await getQuestionImage(paperId, qn, kind);
      setImages((p) => ({ ...p, [key]: r.image }));
    } catch {
      setImages((p) => ({ ...p, [key]: "error" }));
    }
  }
  if (q.isPending) return <p className="u2-muted">Loading…</p>;
  if (q.error) return <p role="alert" className="u2-form__error">Couldn&apos;t load answers: {q.error.message}</p>;
  const responses = [...(q.data.responses ?? [])].sort((a, b) => naturalQuestionSort(a.question_number, b.question_number));
  if (responses.length === 0) return <p className="u2-muted">No saved answers for this attempt.</p>;
  return (
    <div className="u2-rows">
      {responses.map((r) => (
        <div key={r.question_number} className="u2-box u2-box--inner">
          <div className="u2-rowactions" style={{ flexWrap: "wrap" }}>
            <strong>Question {r.question_number}</strong>
            {r.marks_awarded != null && <span>{r.marks_awarded} / {r.marks_available}</span>}
            {r.remark && <span className="u2-muted">{r.remark}</span>}
            {r.flagged && <span title="Flagged for review while answering">🚩 Flagged for review</span>}
            <Button size="sm" variant="ghost" onClick={() => void show(r.question_number, "qp")}>Question</Button>
            {r.marks_awarded != null && <Button size="sm" variant="ghost" onClick={() => void show(r.question_number, "ms")}>Mark scheme</Button>}
          </div>
          {(["qp", "ms"] as const).map((k) => {
            const v = images[`${r.question_number}:${k}`];
            if (v === undefined) return null;
            if (v === "error") return <p key={k} className="u2-form__error">Couldn&apos;t load the {k === "ms" ? "mark scheme" : "question"}.</p>;
            if (v === "" || v === "loading") return <p key={k} className="u2-muted">Loading…</p>;
            // eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service
            return <img key={k} src={v} alt={`${k === "ms" ? "Mark scheme" : "Question"} ${r.question_number}`} style={{ maxWidth: "100%" }} />;
          })}
          <Feedback answer={r.student_answer} correctAnswer={r.correct_answer ?? undefined} lineFeedback={r.line_feedback} markBreakdown={r.mark_breakdown} styleChecklist={r.style_checklist} fullMarkAnswer={r.full_mark_answer} />
        </div>
      ))}
    </div>
  );
}

function Mistakes({ chart, subject, setSubject, label }: { chart: Record<string, Record<string, number>>; subject: string; setSubject: (s: string) => void; label: (s: string, c: string | null) => string }) {
  const subjects = Object.keys(chart);
  const shown = subject ? [subject] : subjects;
  return (
    <div className="u2-rows">
      <p className="u2-muted" style={{ margin: 0 }}>One bar per chapter: total mistakes ever made there, including ones you&apos;ve since fixed. This is history, not your current weak spots.</p>
      <Field label="Subject"><Combobox value={subject} onChange={setSubject} placeholder="All subjects" options={opts(subjects)} /></Field>
      {shown.length === 0 && <p className="u2-muted">No mistakes recorded yet.</p>}
      {shown.map((s) => (
        <div key={s}>
          <h3 style={{ margin: "0 0 var(--u2-space-2)" }}>{s}</h3>
          <BarChart label={`Mistakes per chapter, ${s}`} data={Object.entries(chart[s] ?? {}).sort(([a], [b]) => (parseFloat(a) - parseFloat(b)) || a.localeCompare(b)).map(([c, n]) => ({ key: c, label: label(s, c), value: n }))} />
        </div>
      ))}
    </div>
  );
}

function Board({ lb, account, titles, attempts, names }: { lb: Leaderboard; account: string; titles: Record<string, string>; attempts: AttemptRow[]; names: Record<string, string> }) {
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [paper, setPaper] = useState("");
  const info = useMemo(() => Object.fromEntries(attempts.map((a) => [a.paper_id, { subject: a.subject, chapter: a.chapter }])), [attempts]);
  const chapters = subject ? Object.keys(lb.byChapter[subject] ?? {}) : [];
  const papers = subject && chapter ? Object.keys(lb.byPaper).filter((id) => info[id]?.subject === subject && info[id]?.chapter === chapter) : [];
  const scope = paper ? lb.byPaper[paper] : chapter ? lb.byChapter[subject]?.[chapter] : subject ? lb.bySubject[subject] : undefined;
  const rank = (rows: RankEntry[] | undefined, key: "avgPercent" | "totalCorrect", suffix = "") => (
    <DataTable
      caption={key === "avgPercent" ? "By average score" : "By total correct"} rows={(rows ?? []).slice(0, 10)} rowKey={(e) => e.accountId} emptyText="No attempts yet."
      columns={[
        { id: "n", header: "#", width: 40, cell: (e) => (rows ?? []).indexOf(e) + 1 },
        { id: "s", header: "Student", cell: (e) => <strong className={e.accountId === account ? "u2-strong" : ""}>{e.name}{e.accountId === account ? " (you)" : ""}</strong> },
        { id: "v", header: key === "avgPercent" ? "Avg %" : "Total correct", width: 110, numeric: true, cell: (e) => `${e[key]}${suffix}` },
        { id: "a", header: "Attempts", width: 90, numeric: true, cell: (e) => e.attempts },
      ]}
    />
  );
  return (
    <div className="u2-rows">
      <p className="u2-muted" style={{ margin: 0 }}>&quot;Overall&quot; counts attempts and questions answered only. Comparing accuracy across subjects isn&apos;t fair, so average % appears once you pick a subject, chapter or paper.</p>
      <div className="u2-grid3">
        <Field label="Subject"><Combobox value={subject} onChange={(v) => { setSubject(v); setChapter(""); setPaper(""); }} placeholder="Overall (all subjects)" options={opts(Object.keys(lb.bySubject ?? {}))} /></Field>
        <Field label="Chapter"><Combobox value={chapter} onChange={(v) => { setChapter(v); setPaper(""); }} placeholder="All chapters" disabled={!subject} options={opts(chapters, (c) => chapterLabel(names, subject, c))} /></Field>
        <Field label="Paper"><Combobox value={paper} onChange={setPaper} placeholder="All papers" disabled={!chapter} options={opts(papers, (id) => titles[id] || id)} /></Field>
      </div>
      {subject ? (
        <>
          <h3 style={{ margin: 0 }}>By average score</h3>
          {rank(scope?.byAvgPercent, "avgPercent", "%")}
          <h3 style={{ margin: 0 }}>By total correct</h3>
          {rank(scope?.byTotalCorrect, "totalCorrect")}
        </>
      ) : (
        <>
          <h3 style={{ margin: 0 }}>By volume</h3>
          <DataTable
            caption="By volume" rows={(lb.overall ?? []).slice(0, 10)} rowKey={(e) => e.accountId} emptyText="No attempts yet."
            columns={[
              { id: "n", header: "#", width: 40, cell: (e) => (lb.overall ?? []).indexOf(e) + 1 },
              { id: "s", header: "Student", cell: (e) => <strong className={e.accountId === account ? "u2-strong" : ""}>{e.name}{e.accountId === account ? " (you)" : ""}</strong> },
              { id: "a", header: "Attempts", width: 90, numeric: true, cell: (e) => e.attempts },
              { id: "p", header: "Unique papers", width: 110, numeric: true, cell: (e) => e.uniquePapers },
              { id: "q", header: "Unique questions", width: 130, numeric: true, cell: (e) => e.uniqueQuestions },
            ]}
          />
        </>
      )}
    </div>
  );
}

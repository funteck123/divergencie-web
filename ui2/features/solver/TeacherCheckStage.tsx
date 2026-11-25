"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Field, TextArea, TextInput } from "@/ui2/components/Field";
import { Skeleton } from "@/ui2/components/Skeleton";
import { ApiError } from "@/ui2/queries/client";
import { getQuestionImage, getQuestionResponses, loadSelfMarked, saveTeacherCheck } from "@/ui2/queries/solver";
import { checkSelfMark } from "./selfMarkLogic";
import { buildCheckBody, initialEdits, latestCheck, selfRows, totalsOf, type CheckEdit } from "./teacherCheckLogic";
import type { SelfMarkedItem } from "./solverTypes";
import "./solver.css";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const when = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); };

/** TKT-0445: for a teacher. Every paper a student marked themselves, then one paper at a time: the question and the answer side by side, the student's answer, their marks and comment, and boxes for the teacher's own marks. */
export function TeacherCheckStage({ titles, onBack }: { titles: Record<string, string>; onBack: () => void }) {
  const q = useQuery({ queryKey: ["solver-selfmarked"] as const, queryFn: loadSelfMarked });
  const [open, setOpen] = useState<SelfMarkedItem | null>(null);
  const titleOf = (id: string) => titles[id] || id;
  if (open) return <CheckOne item={open} title={titleOf(open.paperId)} onBack={() => setOpen(null)} />;
  const cols: Column<SelfMarkedItem>[] = [
    { id: "student", header: "Student", width: 160, cell: (r) => r.accountName },
    { id: "paper", header: "Paper", tip: (r) => titleOf(r.paperId), cell: (r) => titleOf(r.paperId) },
    { id: "when", header: "Marked", width: 150, cell: (r) => when(r.createdAt) },
    { id: "marks", header: "Student's marks", width: 120, numeric: true, cell: (r) => `${r.awarded} / ${r.available}` },
    { id: "state", header: "Your check", width: 190, cell: (r) => (r.check ? <Badge kind="success">{`${r.check.awarded} / ${r.check.available} by ${r.check.by}`}</Badge> : <Badge kind="warning">Not checked</Badge>) },
    { id: "open", header: "", width: 80, cell: (r) => <Button size="sm" variant="ghost" onClick={() => setOpen(r)}>{r.check ? "Open" : "Check"}</Button> },
  ];
  return (
    <div className="u2-solver">
      <h2>Self-marked papers</h2>
      <p className="u2-muted">Papers where the student gave their own marks. Open one to check them.</p>
      {q.isPending ? <Skeleton height={160} label="Loading self-marked papers" /> : q.error ? <p role="alert" className="u2-errorbox">Couldn&apos;t load the papers ({msg(q.error)}).</p> : (
        <DataTable caption="Self-marked papers" rows={q.data} columns={cols} rowKey={(r) => r.attemptId} emptyText="No student has marked a paper themselves yet." />
      )}
      <div className="u2-rowactions"><Button variant="ghost" onClick={onBack}>← Back to library</Button></div>
    </div>
  );
}

function Pic({ paperId, q, kind }: { paperId: string; q: string; kind: "qp" | "ms" }) {
  const img = useQuery({ queryKey: ["solver-img", paperId, q, kind] as const, queryFn: () => getQuestionImage(paperId, q, kind), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2, staleTime: 30 * 60_000 });
  const label = kind === "ms" ? "Answer" : "Question";
  if (img.isPending) return <Skeleton height={120} label={`Loading ${label.toLowerCase()} ${q}`} />;
  if (img.error) return <p className="u2-muted">{img.error instanceof ApiError && img.error.status === 404 ? `There is no ${label.toLowerCase()} picture for this question.` : `Couldn't load the ${label.toLowerCase()}.`}</p>;
  // eslint-disable-next-line @next/next/no-img-element -- data URL from the solver service
  return <img src={img.data.image} alt={`${label} ${q}`} loading="lazy" className="u2-contain" />;
}

function CheckOne({ item, title, onBack }: { item: SelfMarkedItem; title: string; onBack: () => void }) {
  const qc = useQueryClient();
  const r = useQuery({ queryKey: ["solver-responses", item.accountId, item.attemptId] as const, queryFn: () => getQuestionResponses(item.accountId, item.attemptId) });
  const [edits, setEdits] = useState<Record<string, CheckEdit> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  if (r.isPending) return <div className="u2-solver"><Skeleton height={200} label="Loading the answers" /></div>;
  if (r.error) return <div className="u2-solver"><p role="alert" className="u2-errorbox">Couldn&apos;t load the answers ({msg(r.error)}).</p><Button variant="ghost" onClick={onBack}>← Back</Button></div>;
  const rows = selfRows(r.data.responses ?? []);
  const before = latestCheck(r.data.responses ?? []);
  const cur = edits ?? initialEdits(rows);
  const set = (q: string, field: keyof CheckEdit, v: string) => setEdits({ ...cur, [q]: { ...(cur[q] as CheckEdit), [field]: v } });
  const mine = totalsOf(rows.flatMap((x) => { const c = checkSelfMark({ awarded: cur[x.q]?.awarded ?? "", outOf: cur[x.q]?.outOf ?? "", note: "" }); return c.state === "ok" ? [{ awarded: c.awarded, available: c.outOf }] : []; }));
  const student = totalsOf(rows);

  async function save() {
    const built = buildCheckBody(item.attemptId, rows, cur);
    if (!("body" in built)) return setError(built.message);
    setSaving(true); setError("");
    try {
      await saveTeacherCheck(built.body);
      setDone(`Your check is saved: ${built.body.rows.length} question${built.body.rows.length === 1 ? "" : "s"}. The student can see it in their answers.`);
      void qc.invalidateQueries({ queryKey: ["solver-selfmarked"] });
      void qc.invalidateQueries({ queryKey: ["solver-responses", item.accountId, item.attemptId] });
      setEdits(null);
    } catch (e) { setError(`Couldn't save your check (${msg(e)}).`); } finally { setSaving(false); }
  }

  return (
    <div className="u2-solver">
      <h2>{title}</h2>
      <p className="u2-muted">{item.accountName}, marked {when(item.createdAt)}.{before ? ` Last checked by ${before.by}.` : ""}</p>
      <div className="u2-banner" role="status">
        <span>Student {student.awarded} / {student.available}. Your marks</span>
        <span className="u2-banner__big">{mine.awarded} / {mine.available}</span>
      </div>
      <div className="u2-rowactions">
        <Button variant="secondary" onClick={() => setEdits(initialEdits(rows))}>Agree with all the student&apos;s marks</Button>
      </div>
      {rows.length === 0 && <p className="u2-muted">This attempt has no self-marked answers.</p>}
      {rows.map((x) => {
        const e = cur[x.q] ?? { awarded: "", outOf: "", comment: "" };
        const c = checkSelfMark({ awarded: e.awarded, outOf: e.outOf, note: "" });
        const prev = before?.marks[x.q];
        return (
          <article key={x.q} className="u2-qcard" aria-label={`Question ${x.q}`}>
            <strong>Question {x.q}</strong>
            <div className="u2-selfmark__pair">
              <figure className="u2-selfmark__fig"><figcaption>Question</figcaption><Pic paperId={item.paperId} q={x.q} kind="qp" /></figure>
              <figure className="u2-selfmark__fig"><figcaption>Answer</figcaption><Pic paperId={item.paperId} q={x.q} kind="ms" /></figure>
            </div>
            <div>
              <span className="u2-muted">Student&apos;s answer</span>
              <pre className="u2-selfmark__answer">{x.answer.trim() || "No answer written."}</pre>
            </div>
            <p><strong>Student gave {x.awarded} / {x.available}.</strong> {x.note ? <span>Comment: {x.note}</span> : <span className="u2-muted">No comment.</span>}</p>
            {prev && <p className="u2-muted">Earlier check: {prev.awarded} / {prev.available}. {prev.remark}</p>}
            <div className="u2-selfmark__marks">
              <Field label="Your marks" error={c.state === "invalid" ? c.message : undefined}>
                <TextInput inputMode="numeric" value={e.awarded} onChange={(ev) => set(x.q, "awarded", ev.target.value)} />
              </Field>
              <Field label="Out of">
                <TextInput inputMode="numeric" value={e.outOf} onChange={(ev) => set(x.q, "outOf", ev.target.value)} />
              </Field>
            </div>
            <Field label="Comment for the student" hint="Optional.">
              <TextArea rows={2} value={e.comment} onChange={(ev) => set(x.q, "comment", ev.target.value)} />
            </Field>
          </article>
        );
      })}
      {error && <p role="alert" className="u2-errorbox">{error}</p>}
      {done && <p role="status" className="u2-muted">{done}</p>}
      <div className="u2-rowactions">
        <Button variant="primary" loading={saving} onClick={() => void save()}>Save my check</Button>
        <Button variant="ghost" disabled={saving} onClick={onBack}>← Back to the list</Button>
      </div>
    </div>
  );
}

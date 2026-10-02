"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Field, TextInput } from "@/ui2/components/Field";
import type { SessionUser } from "@/ui2/components/RequireUser";
import { LineChart, type Series } from "@/ui2/features/solver/Charts";
import { getSyllabus, listSyllabi, loadSyllabusProgress, postTopicComplete } from "@/ui2/queries/syllabus";
import {
  TAG_OPTIONS, TAGS_STORAGE_KEY, chapterOf, exportFilename, exportHtml, flattenTagged, groupByLevel, imageSrc, leaderboardScope, nodeKeyOf, parseContentBlocks, parseTagStore, runningTotals, tagsOf, withTag,
  type Completion, type SyllabusData, type SyllabusMeta, type TagKey, type TagStore, type TopicNode,
} from "./syllabusLogic";
import "./syllabus.css";

const readTags = (): TagStore => { try { return parseTagStore(window.localStorage.getItem(TAGS_STORAGE_KEY)); } catch { return {}; } };
const writeTags = (s: TagStore) => { try { window.localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(s)); } catch { /* private mode: tags last for this visit only */ } };
const opts = (list: readonly string[], label?: (s: string) => string) => list.map((v) => ({ value: v, label: label ? label(v) : v }));

/** Subject list, the digitized outline with tags, the tagged-topics export, and the progress and leaderboard page. */
export function SyllabusView({ user }: { user: SessionUser }) {
  const listQ = useQuery({ queryKey: ["syllabus-list"] as const, queryFn: listSyllabi });
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"outline" | "progress">("outline");
  const dataQ = useQuery({ queryKey: ["syllabus", active] as const, queryFn: () => getSyllabus(active as string), enabled: !!active, staleTime: Infinity });
  const [tags, setTags] = useState<TagStore>(readTags);
  const [raw, setRaw] = useState(false);
  const list = listQ.data ?? [];
  const meta = list.find((s) => s.filename === active);

  function setTag(nodeKey: string, label: string, tag: TagKey, on: boolean) {
    if (!active) return;
    const next = withTag(tags, active, nodeKey, tag, on);
    setTags(next);
    writeTags(next);
    if (tag === "completed") void postTopicComplete({ accountName: user.Name, subject: active, nodeKey, nodeLabel: label, completed: on });
  }

  if (view === "progress") return <SyllabusProgress account={user.UserID} list={list} onBack={() => setView("outline")} />;
  return (
    <div className="u2-syl">
      <aside className="u2-syl__list" aria-label="Subjects">
        <TextInput type="search" aria-label="Filter subjects" placeholder="Filter subjects…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button variant="ghost" size="sm" onClick={() => setView("progress")}>My progress &amp; leaderboard</Button>
        {listQ.isPending && <div className="u2-skeleton" style={{ height: 160 }} aria-busy="true" />}
        {listQ.error && <p role="alert" className="u2-form__error">Couldn&apos;t load subjects ({listQ.error.message}).</p>}
        {groupByLevel(list, query).map((g) => (
          <div key={g.level}>
            <p className="u2-syl__level">{g.level} ({g.items.length})</p>
            {g.items.map((s) => (
              <button key={s.filename} type="button" className="u2-syl__subject" aria-current={s.filename === active} onClick={() => { setActive(s.filename); setRaw(false); }}>
                <span>{s.subject}</span><span className="u2-syl__code">{s.code} · {s.cycle}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <section className="u2-syl__main" aria-live="polite">
        {!active && <p className="u2-muted">Pick a subject from the list to digitize its syllabus booklet into a topic outline.</p>}
        {active && dataQ.isFetching && !dataQ.data && <p role="status">Digitizing…</p>}
        {active && dataQ.error && <p role="alert" className="u2-errorbox">{dataQ.error.message} <Button size="sm" variant="ghost" onClick={() => void dataQ.refetch()}>Try again</Button></p>}
        {active && dataQ.data?.error && <p role="alert" className="u2-errorbox">{dataQ.data.error}</p>}
        {active && dataQ.data && !dataQ.data.error && <Outline key={active} filename={active} meta={meta} data={dataQ.data} tags={tags} setTag={setTag} raw={raw} setRaw={setRaw} />}
      </section>
    </div>
  );
}

function Outline({ filename, meta, data, tags, setTag, raw, setRaw }: { filename: string; meta: SyllabusMeta | undefined; data: SyllabusData; tags: TagStore; setTag: (key: string, label: string, tag: TagKey, on: boolean) => void; raw: boolean; setRaw: (b: boolean) => void }) {
  const tree = data.tree ?? data.topics ?? [];
  const subject = meta?.subject || filename;
  function exportTagged() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const at = `${new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "long" }).format(new Date())} (${tz})`;
    const html = exportHtml({ subject, code: meta?.code ?? "" }, filename, flattenTagged(tree, tags, filename), at);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url; a.download = exportFilename({ subject }, filename);
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="u2-syl__head">
        <div>
          <h2>{subject}</h2>
          <p className="u2-muted">{meta?.level} · {meta?.code} · exams {meta?.cycle} · {data.pageCount} pages</p>
        </div>
        <div className="u2-rowactions">
          <Button variant="ghost" onClick={exportTagged}>Export tagged topics</Button>
          <Button variant="ghost" aria-pressed={raw} onClick={() => setRaw(!raw)}>{raw ? "hide raw JSON" : "view raw JSON"}</Button>
        </div>
      </div>
      {data.sectionGuessed && <p className="u2-warnbox" role="status">This subject has no chapter literally titled &quot;Subject content&quot;. Showing chapter 3 as a best guess instead. Check it looks right.</p>}
      {data.overviewImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the Syllabus Viewer through our proxy
        <img className="u2-syl__img" src={imageSrc(data.overviewImage)} alt={`${subject} content overview`} loading="lazy" />
      ) : data.overviewImageMissing ? <p className="u2-warnbox" role="status">This subject&apos;s booklet uses an older template with no &quot;Content overview&quot; page. Showing chapters directly below instead.</p> : null}
      {tree.length === 0 ? <p role="status">No topic headings detected in this booklet.</p> : <TopicTree nodes={tree} path="" filename={filename} tags={tags} setTag={setTag} />}
      {data.formulaSheetImage && (
        <details>
          <summary>View formula/data sheet</summary>
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img className="u2-syl__img" src={imageSrc(data.formulaSheetImage)} alt={`${subject} formula sheet`} loading="lazy" />
        </details>
      )}
      {raw && <pre className="u2-rawjson" aria-label="Raw JSON">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}

function TopicTree({ nodes, path, filename, tags, setTag }: { nodes: readonly TopicNode[]; path: string; filename: string; tags: TagStore; setTag: (key: string, label: string, tag: TagKey, on: boolean) => void }) {
  return <>{nodes.map((t, i) => { const key = nodeKeyOf(path, i); return <Topic key={key} node={t} nodeKey={key} filename={filename} tags={tags} setTag={setTag} />; })}</>;
}

function Topic({ node, nodeKey, filename, tags, setTag }: { node: TopicNode; nodeKey: string; filename: string; tags: TagStore; setTag: (key: string, label: string, tag: TagKey, on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const mine = tagsOf(tags, filename, nodeKey);
  const kids = node.children ?? [];
  const blocks = useMemo(() => (open && node.content ? parseContentBlocks(node.content) : []), [open, node.content]);
  return (
    <div className="u2-topic" data-depth={node.depth}>
      <div className="u2-topic__head">
        <button type="button" className="u2-topic__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="u2-topic__arrow" aria-hidden="true">▶</span>
          {node.code && <span className="u2-topic__code">{node.code}</span>}
          <span>{node.title}</span>
        </button>
        <div className="u2-tagrow" role="group" aria-label={`Tags for ${node.title}`}>
          {TAG_OPTIONS.map((o) => (
            <label key={o.key} className="u2-tag" data-on={!!mine[o.key]} style={{ ["--tag-color" as string]: o.color }}>
              <input type="checkbox" checked={!!mine[o.key]} onChange={(e) => setTag(nodeKey, node.title, o.key, e.target.checked)} />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      {open && (
        <div className="u2-topic__body">
          {/* eslint-disable-next-line @next/next/no-img-element -- served by the Syllabus Viewer through our proxy */}
          {node.image && <img src={imageSrc(node.image)} alt={node.title} loading="lazy" />}
          {node.content && (
            <details>
              <summary>View extracted text</summary>
              {blocks.map((b, i) => b.type === "label" ? <div key={i} className="u2-content-label">{b.text}</div> : b.type === "list" ? <ul key={i} className="u2-content-list">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul> : <p key={i}>{b.text}</p>)}
            </details>
          )}
          {!node.content && kids.length === 0 && <p className="u2-muted">No content text under this heading.</p>}
          {kids.length > 0 && <TopicTree nodes={kids} path={nodeKey} filename={filename} tags={tags} setTag={setTag} />}
        </div>
      )}
    </div>
  );
}

function SyllabusProgress({ account, list, onBack }: { account: string; list: readonly SyllabusMeta[]; onBack: () => void }) {
  const q = useQuery({ queryKey: ["syllabus-progress", account] as const, queryFn: () => loadSyllabusProgress(account) });
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [lbSubject, setLbSubject] = useState("");
  const [lbChapter, setLbChapter] = useState("");
  const name = (f: string) => list.find((s) => s.filename === f)?.subject ?? f;
  const data = q.data;
  const mine = data?.mine ?? [];
  const subjects = [...new Set(mine.map((c) => c.subject))];
  const chapters = subject ? [...new Set(mine.filter((c) => c.subject === subject).map((c) => chapterOf(c.node_key)).filter((c): c is string => !!c))] : [];
  const scope = { subject, chapter };
  const { mine: myRows, others } = runningTotals(data?.all ?? [], scope, account);
  const toSeries = (id: string, label: string, rows: Completion[], emphasis = false): Series => ({ id, label, emphasis, points: rows.map((c, i) => ({ x: i + 1, y: i + 1, label: `${i + 1}. ${c.node_label || c.node_key}` })) });
  const series = [toSeries("me", "You", myRows, true), ...Object.entries(others).map(([id, rows]) => toSeries(id, "Another student", rows))];
  const history = [...myRows].reverse();
  const cols: Column<Completion>[] = [
    { id: "t", header: "Topic", cell: (c) => c.node_label || c.node_key },
    { id: "s", header: "Subject", width: 190, cell: (c) => name(c.subject) },
    { id: "c", header: "Chapter", width: 80, cell: (c) => chapterOf(c.node_key) ?? "—" },
    { id: "w", header: "Completed", width: 170, cell: (c) => (c.completed_at ? new Date(c.completed_at).toLocaleString() : "") },
  ];
  const board = data ? leaderboardScope(data.leaderboard, { subject: lbSubject, chapter: lbChapter }) : [];
  const lbChapters = data && lbSubject ? Object.keys(data.leaderboard.byChapter[lbSubject] ?? {}) : [];

  if (q.isPending) return <div className="u2-skeleton" style={{ height: 300 }} aria-busy="true" />;
  if (q.error) return <p role="alert" className="u2-errorbox">Couldn&apos;t load progress/leaderboard data ({q.error.message}). <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>Try again</Button></p>;
  return (
    <div className="u2-solver">
      <div className="u2-rowactions"><Button variant="ghost" onClick={onBack}>← Back to syllabus</Button></div>
      <h2>My progress</h2>
      <div className="u2-grid2">
        <Field label="Subject"><Combobox value={subject} onChange={(v) => { setSubject(v); setChapter(""); }} placeholder="All subjects" options={opts(subjects, name)} /></Field>
        <Field label="Chapter"><Combobox value={chapter} onChange={setChapter} placeholder="All chapters" disabled={!subject} options={opts(chapters)} /></Field>
      </div>
      <LineChart kind="count" series={series} emptyText="No topics marked Completed yet." />
      <DataTable caption="Completed topics" rows={history} columns={cols} rowKey={(c) => `${c.subject}:${c.node_key}`} emptyText="No topics completed yet." />
      <h2>Leaderboard</h2>
      <div className="u2-grid2">
        <Field label="Subject"><Combobox value={lbSubject} onChange={(v) => { setLbSubject(v); setLbChapter(""); }} placeholder="Overall (all subjects)" options={opts(Object.keys(data?.leaderboard.bySubject ?? {}), name)} /></Field>
        <Field label="Chapter"><Combobox value={lbChapter} onChange={setLbChapter} placeholder="All chapters" disabled={!lbSubject} options={opts(lbChapters)} /></Field>
      </div>
      <DataTable
        caption="Leaderboard" rows={board.slice(0, 10)} rowKey={(e) => e.accountId} emptyText="No topics completed yet."
        columns={[
          { id: "n", header: "#", width: 40, cell: (e) => board.indexOf(e) + 1 },
          { id: "s", header: "Student", cell: (e) => <strong className={e.accountId === account ? "u2-strong" : ""}>{e.name}{e.accountId === account ? " (you)" : ""}</strong> },
          { id: "t", header: "Topics completed", width: 150, numeric: true, cell: (e) => e.topicsCompleted },
        ]}
      />
    </div>
  );
}

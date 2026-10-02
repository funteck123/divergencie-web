/** Pure rules of the Syllabus Viewer: tags, content parsing, the tagged-topics export and the progress views. */

export interface SyllabusMeta { filename: string; subject: string; level: string; code: string; cycle: string }
export interface TopicNode { code?: string; title: string; depth: number; content?: string; image?: string; children?: TopicNode[] }
export interface SyllabusData {
  pageCount: number;
  tree?: TopicNode[];
  topics?: TopicNode[];
  sectionGuessed?: boolean;
  overviewImage?: string;
  overviewImageMissing?: boolean;
  formulaSheetImage?: string;
  error?: string;
}
export interface Completion { account_id: string; subject: string; node_key: string; node_label?: string; completed_at?: string }
export interface BoardEntry { accountId: string; name: string; topicsCompleted: number }
export interface SyllabusLeaderboard { overall: BoardEntry[]; bySubject: Record<string, BoardEntry[]>; byChapter: Record<string, Record<string, BoardEntry[]>> }

// Literal hex on purpose: these colours are also written into the exported file, which has no theme variables.
export const TAG_OPTIONS = [
  { key: "completed", label: "Completed", color: "#1f9d55" },
  { key: "revise", label: "Revise", color: "#4a9fd4" },
  { key: "memorised", label: "Memorised", color: "#0e9aa7" },
  { key: "doubt", label: "Doubt", color: "#e8a832" },
  { key: "practice", label: "Practice", color: "#7c5cbf" },
  { key: "critical", label: "Critical", color: "#e05a4e" },
] as const;
export type TagKey = (typeof TAG_OPTIONS)[number]["key"];
export const TAGS_STORAGE_KEY = "syllabusDigitizerTags"; // the same key as the classic page, so tags carry across

// ---- list ----------------------------------------------------------------------------------------------------
export function groupByLevel(list: readonly SyllabusMeta[], query: string): { level: string; items: SyllabusMeta[] }[] {
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((s) => s.subject.toLowerCase().includes(q) || s.code.includes(q)) : list;
  const levels = new Map<string, SyllabusMeta[]>([["IGCSE", []], ["A Level", []]]);
  for (const s of shown) (levels.get(s.level) ?? levels.set(s.level, []).get(s.level))?.push(s);
  return [...levels].filter(([, items]) => items.length > 0).map(([level, items]) => ({ level, items }));
}

export const imageSrc = (relPath: string) => "/api/syllabus/images/" + relPath.split("/").map(encodeURIComponent).join("/");

// ---- topic text ----------------------------------------------------------------------------------------------
export type Block = { type: "label"; text: string } | { type: "list"; items: string[] } | { type: "para"; text: string };
const PLAIN_BULLET = /^•\s*/;
const LETTERED = /^(\(?[a-z]\)|\(?[ivx]+\)|\d{1,2}[.)](?!\d))\s*/;
/** The extractor writes bullets as "• text" and sub-parts as "(a)<tab>text"; [Label] lines are headings. Empty bullets are dropped. */
export function parseContentBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let list: { type: "list"; items: string[] } | null = null;
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const label = line.match(/^\[(.+)\]$/);
    if (label?.[1]) { list = null; blocks.push({ type: "label", text: label[1] }); continue; }
    const plain = line.match(PLAIN_BULLET);
    const lettered = !plain && line.match(LETTERED);
    if (plain || lettered) {
      const item = plain ? line.slice(plain[0].length) : line;
      if (item.trim()) {
        if (!list) { list = { type: "list", items: [] }; blocks.push(list); }
        list.items.push(item);
      }
    } else { list = null; blocks.push({ type: "para", text: line }); }
  }
  return blocks;
}

// ---- tags ----------------------------------------------------------------------------------------------------
export type TagStore = Record<string, Record<string, Partial<Record<TagKey, true>>>>;
export const nodeKeyOf = (path: string, index: number) => (path ? `${path}.${index}` : String(index));
export const tagsOf = (store: TagStore, filename: string, nodeKey: string) => store[filename]?.[nodeKey] ?? {};
/** A new store with one tag set or cleared. Empty nodes and subjects are removed, so the store never fills with blanks. */
export function withTag(store: TagStore, filename: string, nodeKey: string, tag: TagKey, on: boolean): TagStore {
  const subject = { ...(store[filename] ?? {}) };
  const node = { ...(subject[nodeKey] ?? {}) };
  if (on) node[tag] = true; else delete node[tag];
  if (Object.keys(node).length) subject[nodeKey] = node; else delete subject[nodeKey];
  const next = { ...store, [filename]: subject };
  if (!Object.keys(subject).length) delete next[filename];
  return next;
}
export function parseTagStore(raw: string | null): TagStore {
  try { const v = JSON.parse(raw || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export interface TaggedTopic { code?: string; title: string; tags: Partial<Record<TagKey, true>> }
export function flattenTagged(nodes: readonly TopicNode[], store: TagStore, filename: string, path = "", out: TaggedTopic[] = []): TaggedTopic[] {
  nodes.forEach((t, i) => {
    const key = nodeKeyOf(path, i);
    const tags = tagsOf(store, filename, key);
    if (Object.keys(tags).length) out.push({ code: t.code, title: t.title, tags });
    if (t.children?.length) flattenTagged(t.children, store, filename, key, out);
  });
  return out;
}

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** The standalone, colour-coded report of tagged topics. One topic can appear under several tags. */
export function exportHtml(meta: Pick<SyllabusMeta, "subject" | "code">, filename: string, flat: readonly TaggedTopic[], exportedAt: string): string {
  const label = `${meta.subject || filename}${meta.code ? ` (${meta.code})` : ""}`;
  const sections = TAG_OPTIONS.map((opt) => {
    const matches = flat.filter((t) => t.tags[opt.key]);
    if (!matches.length) return "";
    const items = matches.map((t) => `<li>${t.code ? `<span class="tcode">${esc(t.code)}</span> ` : ""}${esc(t.title)}</li>`).join("");
    return `<section style="--c:${opt.color}"><h2>${opt.label} <span class="count">${matches.length}</span></h2><ul>${items}</ul></section>`;
  }).join("");
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${esc(label)}: tagged topics</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f4f4f4; color: #1a1a1a; margin: 0; padding: 0 0 2.5rem; }
  .dc-header { background: #1a3c5e; padding: 1.1rem 1.5rem; display: flex; align-items: center; gap: 0.6rem; border-bottom: 4px solid #e8a832; }
  .dc-wordmark { color: white; font-weight: 800; font-size: 1.05rem; }
  .dc-wordmark .accent { color: #e8a832; }
  .dc-header .dc-tool { color: #cfe0f0; font-size: 0.78rem; border-left: 1px solid rgba(255,255,255,0.25); padding-left: 0.6rem; }
  main { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem 0; }
  h1 { color: #1a3c5e; font-size: 1.4rem; margin: 0 0 0.2rem; }
  .subtitle { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  section { background: white; border-left: 6px solid var(--c); padding: 1.1rem 1.4rem; margin-bottom: 1.25rem; }
  section h2 { margin: 0 0 0.6rem; font-size: 1.05rem; color: var(--c); display: flex; align-items: center; gap: 0.5rem; }
  section .count { background: var(--c); color: white; font-size: 0.7rem; font-weight: 700; border-radius: 999px; padding: 0.1rem 0.55rem; }
  section ul { margin: 0; padding-left: 1.2rem; }
  section li { margin-bottom: 0.4rem; font-size: 0.9rem; }
  .tcode { font-weight: 700; color: #1a3c5e; }
  .empty { color: #666; font-style: italic; }
</style></head>
<body>
<div class="dc-header"><span class="dc-wordmark">Divergen<span class="accent">CIE</span></span><span class="dc-tool">Syllabus Digitizer</span></div>
<main>
  <h1>${esc(label)}</h1>
  <div class="subtitle">Tagged topics · exported ${esc(exportedAt)}</div>
  ${sections || `<p class="empty">No topics tagged yet -- tick a topic in the outline first.</p>`}
</main></body></html>`;
}
export const exportFilename = (meta: Pick<SyllabusMeta, "subject">, filename: string) => `${(meta.subject || filename).replace(/[^a-z0-9]+/gi, "-")}-tagged-topics.html`;

// ---- progress ------------------------------------------------------------------------------------------------
export const chapterOf = (nodeKey: string | null | undefined) => String(nodeKey ?? "").split(".")[0] || null;
export interface Scope { subject: string; chapter: string }
export const completionMatches = (c: Completion, s: Scope) => (!s.subject || c.subject === s.subject) && (!s.chapter || chapterOf(c.node_key) === s.chapter);
/** The leaderboard rows for a scope: overall, one subject, or one chapter of a subject. */
export function leaderboardScope(lb: SyllabusLeaderboard, s: Scope): BoardEntry[] {
  if (s.subject && s.chapter) return lb.byChapter[s.subject]?.[s.chapter] ?? [];
  if (s.subject) return lb.bySubject[s.subject] ?? [];
  return lb.overall ?? [];
}
/** Each account's completions as a running total in the order they were done. */
export function runningTotals(all: readonly Completion[], s: Scope, me: string): { mine: Completion[]; others: Record<string, Completion[]> } {
  const rows = all.filter((c) => completionMatches(c, s));
  const others: Record<string, Completion[]> = {};
  for (const c of rows) if (c.account_id !== me) (others[c.account_id] ??= []).push(c);
  return { mine: rows.filter((c) => c.account_id === me), others };
}

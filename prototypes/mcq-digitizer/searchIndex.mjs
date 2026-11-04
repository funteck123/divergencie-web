// TKT-0237 phase 1b: in-memory word index over the text of every library question (text built by build_search_text.py).
// No database and no dependency: about 19,000 short texts fit in memory and a query answers in well under a millisecond.
//
//   const index = buildIndex(entries)      entries: [{ id, text, also?, ...anything the caller wants back }]; `also` (for example the paper title) is searched but never shown in a snippet
//   search(index, "upper bound area", { limit: 30 })  ->  { total, results: [{ ...entry fields minus text, score, snippet }] }
//
// Matching: every query word must appear (AND). The last word may be a prefix, so a half-typed word still finds things.
// Ranking: rarer words weigh more (IDF), repeats add a little, and the exact phrase in a row adds a bonus.

const WORD = /[a-z0-9]+(?:\.[0-9]+)?/g; // "9.5" stays one word; letters and digits only, so maths symbols and stray glyphs never become words
const STOP = new Set("a an and are as at be by for from has have in is it of on or that the this to was were with what which who how find give state show".split(" "));

/** Lowercase, fold accents and ligatures (PDF text has "ﬁ" for "fi"), then split into words. */
export function tokenize(text) {
  return (String(text ?? "").normalize("NFKC").toLowerCase().match(WORD)) ?? [];
}

export function buildIndex(entries) {
  const docs = [];
  const postings = new Map(); // word -> [docIndex, count][]
  for (const e of entries) {
    const words = tokenize(`${e.text} ${e.also ?? ""}`);
    if (!words.length) continue;
    const id = docs.length;
    const counts = new Map();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const { also, ...shown } = e;
    docs.push({ ...shown, lower: String(e.text).normalize("NFKC").toLowerCase(), alsoLower: String(also ?? "").normalize("NFKC").toLowerCase() });
    for (const [w, n] of counts) {
      let list = postings.get(w);
      if (!list) postings.set(w, (list = []));
      list.push([id, n]);
    }
  }
  return { docs, postings, words: [...postings.keys()].sort() };
}

/** Index range of words starting with `prefix`, by binary search over the sorted word list. */
function prefixWords(index, prefix) {
  const ws = index.words;
  let lo = 0, hi = ws.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ws[mid] < prefix) lo = mid + 1; else hi = mid; }
  const out = [];
  for (let i = lo; i < ws.length && ws[i].startsWith(prefix) && out.length < 40; i++) out.push(ws[i]);
  return out;
}

function snippetOf(doc, terms) {
  const text = String(doc.text).replace(/\s+/g, " ");
  const low = text.normalize("NFKC").toLowerCase();
  let at = -1;
  for (const t of terms) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) at = 0;
  const from = Math.max(0, at - 60);
  const to = Math.min(text.length, from + 220);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}

export function search(index, query, { limit = 30, filter } = {}) {
  const raw = tokenize(query);
  if (!raw.length) return { total: 0, results: [] };
  const useful = raw.filter((w) => !STOP.has(w));
  const terms = useful.length ? useful : raw; // a question made only of small words still searches
  const N = index.docs.length || 1;
  let candidates = null; // Map docId -> score
  terms.forEach((term, i) => {
    const isLast = i === terms.length - 1;
    const variants = index.postings.has(term) ? [term] : isLast ? prefixWords(index, term) : [];
    const hit = new Map();
    for (const w of isLast && index.postings.has(term) ? [term, ...prefixWords(index, term).filter((x) => x !== term)] : variants) {
      const list = index.postings.get(w) ?? [];
      const idf = Math.log(1 + N / (1 + list.length));
      for (const [id, n] of list) hit.set(id, Math.max(hit.get(id) ?? 0, idf * (1 + Math.log(n)) * (w === term ? 1 : 0.6)));
    }
    if (candidates === null) candidates = hit;
    else { const next = new Map(); for (const [id, s] of candidates) if (hit.has(id)) next.set(id, s + hit.get(id)); candidates = next; }
  });
  const phrase = terms.length > 1 ? terms.join(" ") : "";
  const scored = [];
  for (const [id, s] of candidates ?? []) {
    const doc = index.docs[id];
    if (filter && !filter(doc)) continue;
    const bonus = phrase && `${doc.alsoLower} ${doc.lower}`.replace(/\s+/g, " ").includes(phrase) ? 3 : 0;
    // A shorter text with the same hits is the more focused question.
    scored.push([s + bonus - Math.min(1, doc.lower.length / 4000), id]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const results = scored.slice(0, limit).map(([score, id]) => {
    const { text, lower, alsoLower, ...rest } = index.docs[id];
    return { ...rest, score: Math.round(score * 100) / 100, snippet: snippetOf(index.docs[id], terms) };
  });
  return { total: scored.length, results };
}

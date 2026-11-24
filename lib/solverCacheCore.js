// TKT-0420: pure rules of the Question Solver "saved copy" (no network, no Supabase here, so they are tested without either).
//
// A saved copy of a worksheet lives in the private Supabase bucket "solver-cache" as
//   papers/<qpId>.json  : the exact reply of POST /api/mcq/fetch-and-digitize, with each question image re-encoded as AVIF
//   index.json          : { version, updatedAt, papers: { <qpId>: { board, subject, component, title, qpId, msId, ... } }, library: <library shape, saved papers only> }
// The live Question Solver (on the owner's machine) stays the source of truth. The saved copy is used only when it cannot be reached.

export const CACHE_BUCKET = "solver-cache";
export const SOURCE_HEADER = "X-Solver-Source";

/** A Drive file id as used for qpId and msId. Anything else is refused before it becomes part of a storage path. */
export function isSafeId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{6,100}$/.test(id);
}

/** The set of qpIds that have a saved copy. A missing or broken index gives an empty set. */
export function cachedIdSet(index) {
  return new Set(index && typeof index === "object" && index.papers && typeof index.papers === "object" ? Object.keys(index.papers) : []);
}

/** A copy of the library where every paper that has a saved copy carries `cached: true`. The input is not changed. */
export function markCached(library, ids) {
  if (!library || typeof library !== "object" || !ids || ids.size === 0) return library;
  const out = {};
  for (const [board, subjects] of Object.entries(library)) {
    out[board] = {};
    for (const [subject, comps] of Object.entries(subjects || {})) {
      out[board][subject] = {};
      for (const [comp, papers] of Object.entries(comps || {})) {
        out[board][subject][comp] = Array.isArray(papers) ? papers.map((p) => (p && ids.has(p.qpId) ? { ...p, cached: true } : p)) : papers;
      }
    }
  }
  return out;
}

/** The library made of saved papers only, for the moment the live one cannot be reached. */
export function cachedLibrary(index) {
  return index && typeof index === "object" && index.library && typeof index.library === "object" ? index.library : {};
}

import { levelAllows } from "./solverLevels.js";

/** May this person open this saved paper? Management always may; everyone else only for a subject they are enrolled in. */
export function mayOpenCached(entry, allowedKeys, subjectMatchKey) {
  if (!entry) return false;
  if (allowedKeys === null) return true;
  const key = subjectMatchKey(entry.board, entry.subject);
  if (!allowedKeys.has(key)) return false;
  // allowedKeys is a Map from subject to the paper levels the person may see (an AS student does not open an A2 paper); an older Set has no levels.
  return typeof allowedKeys.get === "function" ? levelAllows(allowedKeys.get(key), entry.component, entry.subject) : true;
}

/** The reply for a saved paper: the stored reply plus a flag the page uses to say it is a saved copy. */
export function savedPaperReply(stored) {
  if (!stored || typeof stored !== "object" || !Array.isArray(stored.questions) || stored.questions.length === 0) return null;
  return { ...stored, fromCache: true };
}

/** Should a failed live reply be answered from the saved copy? Unreachable, a bad reply, or a server error, yes; a clear 4xx answer (such as 400 or 404), no. */
export function liveFailed({ threw, status, jsonOk }) {
  if (threw) return true;
  if (!jsonOk) return true;
  return status >= 500;
}

import type { LibraryBundle } from "@/ui2/queries/solver";

/**
 * TKT-0453: the Question Solver's library (papers, titles, yearly papers) took 4 to 12 seconds to arrive on every visit, with a blank picker meanwhile.
 * The last copy is now kept in the browser, per account: the picker shows at once from it and the fresh copy replaces it a moment later.
 * A copy is only a starting point; it is never trusted over the fresh one, and it is dropped after a week or when it cannot be read.
 */
export const BUNDLE_KEY = (account: string) => `u2.solver.bundle.v1.${account}`;
export const BUNDLE_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
export const BUNDLE_MAX_CHARS = 3_000_000; // a copy bigger than this is not kept: browser storage is small and shared

interface Stored { at: number; bundle: LibraryBundle }

/** The saved copy and when it was saved, or null when there is none, it is too old, or it is damaged. */
export function parseBundle(raw: string | null | undefined, now = Date.now()): Stored | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Stored>;
    if (!s || typeof s.at !== "number" || !s.bundle || typeof s.bundle !== "object") return null;
    if (now - s.at > BUNDLE_MAX_AGE_MS || s.at > now + 60_000) return null;
    const b = s.bundle as LibraryBundle;
    if (!b.library || typeof b.library !== "object") return null;
    return { at: s.at, bundle: b };
  } catch {
    return null;
  }
}
/** The text to store, or null when the copy is too big to keep. */
export function stringifyBundle(bundle: LibraryBundle, now = Date.now()): string | null {
  const text = JSON.stringify({ at: now, bundle } satisfies Stored);
  return text.length > BUNDLE_MAX_CHARS ? null : text;
}

export function readBundle(account: string): Stored | null {
  try { return parseBundle(window.localStorage.getItem(BUNDLE_KEY(account))); } catch { return null; }
}
export function writeBundle(account: string, bundle: LibraryBundle) {
  try {
    const text = stringifyBundle(bundle);
    if (text) window.localStorage.setItem(BUNDLE_KEY(account), text);
    else window.localStorage.removeItem(BUNDLE_KEY(account));
  } catch { /* storage full or private mode: the page just loads the slow way */ }
}

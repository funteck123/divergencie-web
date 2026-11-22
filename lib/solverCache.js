import { createClient } from "@supabase/supabase-js";
import { CACHE_BUCKET, isSafeId } from "./solverCacheCore.js";

// TKT-0420: reads the Question Solver's saved copies from the private "solver-cache" bucket (see solverCacheCore.js for the layout).
// Same own-client pattern as lib/storage.js. Every failure here answers "no saved copy" (null): the saved copy must never break the live path.
// Created on first use, not on import: importing the route must never need credentials (tests and builds import it without them).
let client = null;
const supabase = () => (client ??= createClient(process.env.V7_SUPABASE_URL, process.env.V7_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }));

const INDEX_TTL_MS = 60_000;
let memo = { at: 0, index: null };

async function readJson(path) {
  const { data, error } = await supabase().storage.from(CACHE_BUCKET).download(path);
  if (error || !data) return null;
  return JSON.parse(await data.text());
}

/** index.json, kept in memory for a minute (a library request would otherwise read it every time). null when there is none. */
export async function loadCacheIndex(now = Date.now()) {
  if (memo.index && now - memo.at < INDEX_TTL_MS) return memo.index;
  try {
    const index = await readJson("index.json");
    if (index && typeof index === "object") {
      memo = { at: now, index };
      return index;
    }
  } catch {
    /* fall through: an older copy in memory is better than nothing */
  }
  return memo.index;
}

/** The stored reply for one paper, or null. */
export async function loadCachedPaper(qpId) {
  if (!isSafeId(qpId)) return null;
  try {
    return await readJson(`papers/${qpId}.json`);
  } catch {
    return null;
  }
}

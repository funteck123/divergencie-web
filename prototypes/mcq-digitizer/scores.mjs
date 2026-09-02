// Score tracking for mcq-digitizer -- deliberately its own module, isolated
// from the main app's lib/db-supabase.js and lib/storage.js: this prototype
// stays independent of the main Next.js app (own Supabase client, own table,
// no shared code), so it can keep working even if the main app's DB layer
// changes shape. See planning/mcq-digitizer-integration-plan.md for why.
//
// No login in this prototype -- the account travels as ?account=<id> and
// (optionally) &name=<display name> on the link a student is given. If name
// is missing, callers should fall back to showing the raw account id rather
// than failing.
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env.local") });

const TABLE = "mcq_attempts";

let client = null;
function getClient() {
  if (client) return client;
  const url = process.env.V7_SUPABASE_URL;
  const key = process.env.V7_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

// Table not created yet (planning/mcq-digitizer-integration-plan.md's
// migration is pending manual approval) -- every function below degrades to
// a clear, typed error rather than throwing an opaque Supabase client error,
// so the server can return a sane response instead of a 500 with a stack.
export class ScoresUnavailableError extends Error {}

function requireClient() {
  const c = getClient();
  if (!c) throw new ScoresUnavailableError("Supabase credentials not configured (V7_SUPABASE_URL / V7_SUPABASE_SERVICE_ROLE_KEY).");
  return c;
}

export async function recordAttempt({ accountId, accountName, subject, paperId, score, totalQuestions }) {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .insert({
      account_id: accountId,
      account_name: accountName || null,
      subject,
      paper_id: paperId,
      score,
      total_questions: totalQuestions,
    })
    .select()
    .single();
  if (error) throw new Error(`Could not record attempt: ${error.message}`);
  return data;
}

export async function getProgressForAccount(accountId) {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("subject, paper_id, score, total_questions, submitted_at")
    .eq("account_id", accountId)
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(`Could not load progress: ${error.message}`);
  return data;
}

// Every account's attempts, for the "everyone over time" background
// overlay -- account id + name + score + timestamp only, nothing else.
export async function getAllProgress() {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("account_id, account_name, subject, paper_id, score, total_questions, submitted_at")
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(`Could not load progress: ${error.message}`);
  return data;
}

function displayName(accountId, accountName) {
  return accountName || accountId;
}

// Two independent rankings, matching the explicit decision to keep both
// rather than blend into one number: average % correct rewards accuracy
// regardless of volume, total correct rewards volume/practice as well.
// Each is computed both overall and per paper.
export async function getLeaderboard() {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("account_id, account_name, subject, paper_id, score, total_questions");
  if (error) throw new Error(`Could not load leaderboard: ${error.message}`);

  function rank(rows, keyFn) {
    const byAccount = new Map();
    for (const row of rows) {
      const key = keyFn(row);
      if (!byAccount.has(key)) {
        byAccount.set(key, { accountId: row.account_id, name: displayName(row.account_id, row.account_name), totalCorrect: 0, totalQuestions: 0, attempts: 0 });
      }
      const entry = byAccount.get(key);
      entry.totalCorrect += row.score;
      entry.totalQuestions += row.total_questions;
      entry.attempts += 1;
    }
    const entries = [...byAccount.values()].map((e) => ({
      ...e,
      avgPercent: e.totalQuestions > 0 ? Math.round((e.totalCorrect / e.totalQuestions) * 1000) / 10 : 0,
    }));
    return {
      byAvgPercent: [...entries].sort((a, b) => b.avgPercent - a.avgPercent),
      byTotalCorrect: [...entries].sort((a, b) => b.totalCorrect - a.totalCorrect),
    };
  }

  const overall = rank(data, (row) => row.account_id);

  const byPaper = {};
  const paperRowsByPaper = new Map();
  for (const row of data) {
    if (!paperRowsByPaper.has(row.paper_id)) paperRowsByPaper.set(row.paper_id, []);
    paperRowsByPaper.get(row.paper_id).push(row);
  }
  for (const [paperId, rows] of paperRowsByPaper) {
    byPaper[paperId] = rank(rows, (row) => row.account_id);
  }

  return { overall, byPaper };
}

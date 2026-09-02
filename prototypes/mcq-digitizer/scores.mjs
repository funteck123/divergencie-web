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

export class InvalidAttemptError extends Error {}

export async function recordAttempt({ accountId, accountName, subject, chapter, paperId, score, totalQuestions, timeTakenSeconds }) {
  if (!Number.isInteger(score) || !Number.isInteger(totalQuestions) || totalQuestions <= 0 || score < 0 || score > totalQuestions) {
    throw new InvalidAttemptError("score and totalQuestions must be integers, with 0 <= score <= totalQuestions and totalQuestions > 0.");
  }
  if (timeTakenSeconds != null && (!Number.isInteger(timeTakenSeconds) || timeTakenSeconds < 0)) {
    throw new InvalidAttemptError("timeTakenSeconds must be a non-negative integer when provided.");
  }
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .insert({
      account_id: accountId,
      account_name: accountName || null,
      subject,
      chapter: chapter || null,
      paper_id: paperId,
      score,
      total_questions: totalQuestions,
      time_taken_seconds: timeTakenSeconds ?? null,
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
    .select("subject, chapter, paper_id, score, total_questions, time_taken_seconds, submitted_at")
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
    .select("account_id, account_name, subject, chapter, paper_id, score, total_questions, submitted_at")
    .order("submitted_at", { ascending: true });
  if (error) throw new Error(`Could not load progress: ${error.message}`);
  return data;
}

function displayName(accountId, accountName) {
  return accountName || accountId;
}

// Ranking helper shared by every tier below (subject/chapter/paper): two
// independent rankings, average % correct (accuracy) and total correct
// (volume/practice). Both are only ever meaningful WITHIN one subject
// (or narrower) -- comparing avg% across different subjects of different
// difficulty isn't a fair "who's better" signal, which is exactly why
// the top-level "overall" tier below deliberately does NOT use this and
// exposes volume only.
function rank(rows) {
  const byAccount = new Map();
  for (const row of rows) {
    if (!byAccount.has(row.account_id)) {
      byAccount.set(row.account_id, { accountId: row.account_id, name: displayName(row.account_id, row.account_name), totalCorrect: 0, totalQuestions: 0, attempts: 0 });
    }
    const entry = byAccount.get(row.account_id);
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

// Volume only (total attempts / total questions answered) -- deliberately
// no avg% at this tier, see rank()'s own comment above for why.
function rankByVolume(rows) {
  const byAccount = new Map();
  for (const row of rows) {
    if (!byAccount.has(row.account_id)) {
      byAccount.set(row.account_id, { accountId: row.account_id, name: displayName(row.account_id, row.account_name), attempts: 0, totalQuestions: 0 });
    }
    const entry = byAccount.get(row.account_id);
    entry.attempts += 1;
    entry.totalQuestions += row.total_questions;
  }
  return [...byAccount.values()].sort((a, b) => b.totalQuestions - a.totalQuestions);
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

// Four tiers, from broadest to narrowest -- see
// planning/mcq-digitizer-integration-plan.md's architecture writeup:
//   overall  -- every account, every subject, volume only (fair: just
//               "how much has this account practiced," no cross-subject
//               accuracy comparison).
//   bySubject/byChapter/byPaper -- avg% + total correct, each scoped to
//               accounts that actually attempted something in that
//               subject/chapter/paper -- an apples-to-apples comparison
//               by construction, not by filtering.
export async function getLeaderboard() {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("account_id, account_name, subject, chapter, paper_id, score, total_questions");
  if (error) throw new Error(`Could not load leaderboard: ${error.message}`);

  const overall = rankByVolume(data);

  const bySubject = {};
  for (const [subject, rows] of groupBy(data, (r) => r.subject)) {
    bySubject[subject] = rank(rows);
  }

  const byChapter = {};
  for (const [subject, subjectRows] of groupBy(data, (r) => r.subject)) {
    const chapterGroups = groupBy(subjectRows, (r) => r.chapter);
    if (chapterGroups.size === 0) continue;
    byChapter[subject] = {};
    for (const [chapter, rows] of chapterGroups) {
      byChapter[subject][chapter] = rank(rows);
    }
  }

  const byPaper = {};
  for (const [paperId, rows] of groupBy(data, (r) => r.paper_id)) {
    byPaper[paperId] = rank(rows);
  }

  return { overall, bySubject, byChapter, byPaper };
}

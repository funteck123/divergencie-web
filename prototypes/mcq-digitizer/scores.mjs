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

export async function recordAttempt({ accountId, accountName, subject, chapter, paperId, score, totalQuestions, timeTakenSeconds, mode }) {
  const attemptMode = mode === "practice" ? "practice" : "test";
  if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
    throw new InvalidAttemptError("totalQuestions must be a positive integer.");
  }
  // Practice mode has no grading (see server.mjs's own header comment) --
  // score is always null for it, regardless of what's passed. Test mode
  // keeps the original strict bounds check.
  let storedScore = null;
  if (attemptMode === "test") {
    if (!Number.isInteger(score) || score < 0 || score > totalQuestions) {
      throw new InvalidAttemptError("score must be an integer with 0 <= score <= totalQuestions for a Test-mode attempt.");
    }
    storedScore = score;
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
      score: storedScore,
      total_questions: totalQuestions,
      time_taken_seconds: timeTakenSeconds ?? null,
      mode: attemptMode,
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
    .select("subject, chapter, paper_id, score, total_questions, time_taken_seconds, mode, submitted_at")
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
    .select("account_id, account_name, subject, chapter, paper_id, score, total_questions, mode, submitted_at")
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
//
// Practice-mode rows (score === null, un-graded by design) are excluded
// here entirely -- there is no "correct" to count, and treating a null
// as 0 would make a practice session look like a failed test attempt.
function rank(rows) {
  const byAccount = new Map();
  for (const row of rows) {
    if (row.mode === "practice" || row.score == null) continue;
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

// Volume only -- deliberately no avg% at this tier, see rank()'s own
// comment above for why. Unlike rank(), this DOES include practice-mode
// rows -- "how much has this account practiced" is a real, meaningful
// activity signal whether or not any given session was graded.
//
// uniqueQuestions/uniquePapers count each paper ONCE per account no
// matter how many times it was retaken -- retaking the same 10-question
// paper 3 times previously inflated this to 30, which rewarded repetition
// over actual breadth of coverage. `attempts` is kept separate and
// UNCHANGED (every attempt, repeats included) since "how many times has
// this account practiced" is still a real, distinct signal from "how much
// of the library have they covered."
function rankByVolume(rows) {
  const byAccount = new Map();
  const seenPapersByAccount = new Map();
  for (const row of rows) {
    if (!byAccount.has(row.account_id)) {
      byAccount.set(row.account_id, { accountId: row.account_id, name: displayName(row.account_id, row.account_name), attempts: 0, uniquePapers: 0, uniqueQuestions: 0 });
      seenPapersByAccount.set(row.account_id, new Set());
    }
    const entry = byAccount.get(row.account_id);
    const seenPapers = seenPapersByAccount.get(row.account_id);
    entry.attempts += 1;
    if (!seenPapers.has(row.paper_id)) {
      seenPapers.add(row.paper_id);
      entry.uniquePapers += 1;
      entry.uniqueQuestions += row.total_questions;
    }
  }
  return [...byAccount.values()].sort((a, b) => b.uniqueQuestions - a.uniqueQuestions);
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
    .select("account_id, account_name, subject, chapter, paper_id, score, total_questions, mode");
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

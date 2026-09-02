// Topic-completion tracking for syllabus-digitizer -- mirrors
// mcq-digitizer/scores.mjs's design exactly (own Supabase client, own
// table, zero imports from lib/, no login -- account travels as
// ?account=<id>&name=<display name> on the link a student is given).
//
// Unlike MCQ's graded attempts, there's no "score" here -- syllabus-
// digitizer has no quiz/grading concept at all (see its own README).
// "Progress" here means the student's own "Completed" tag (already an
// existing client-only, localStorage-only feature -- TAG_OPTIONS in
// index.html) on a real Cambridge syllabus topic. This module makes that
// state durable and shared (retained across devices/browsers) instead of
// living only in one browser's localStorage, and gives it the same
// progress-curve/leaderboard treatment as MCQ.
//
// One row per topic a student has marked "Completed", uniquely keyed by
// (account_id, filename, node_key) -- marking again is a no-op (upsert),
// unmarking deletes the row. completed_at is fixed at first-completion
// time and never touched again, so a student's own progress curve
// (cumulative topics completed over time) is genuinely chronological even
// though "current total completed" is a live count, not an ever-growing
// log.
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env.local") });

const TABLE = "syllabus_completions";

let client = null;
function getClient() {
  if (client) return client;
  const url = process.env.V7_SUPABASE_URL;
  const key = process.env.V7_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export class ProgressUnavailableError extends Error {}

function requireClient() {
  const c = getClient();
  if (!c) throw new ProgressUnavailableError("Supabase credentials not configured (V7_SUPABASE_URL / V7_SUPABASE_SERVICE_ROLE_KEY).");
  return c;
}

export async function markTopicCompleted({ accountId, accountName, subject, nodeKey, nodeLabel }) {
  const c = requireClient();
  // upsert + ignoreDuplicates so re-marking an already-completed topic is
  // a silent no-op, not a second row and not a changed completed_at.
  const { error } = await c
    .from(TABLE)
    .upsert(
      { account_id: accountId, account_name: accountName || null, subject, node_key: nodeKey, node_label: nodeLabel },
      { onConflict: "account_id,subject,node_key", ignoreDuplicates: true }
    );
  if (error) throw new Error(`Could not save topic completion: ${error.message}`);
}

export async function unmarkTopicCompleted({ accountId, subject, nodeKey }) {
  const c = requireClient();
  const { error } = await c.from(TABLE).delete().match({ account_id: accountId, subject, node_key: nodeKey });
  if (error) throw new Error(`Could not remove topic completion: ${error.message}`);
}

export async function getProgressForAccount(accountId) {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("subject, node_key, node_label, completed_at")
    .eq("account_id", accountId)
    .order("completed_at", { ascending: true });
  if (error) throw new Error(`Could not load progress: ${error.message}`);
  return data;
}

export async function getAllProgress() {
  const c = requireClient();
  const { data, error } = await c
    .from(TABLE)
    .select("account_id, account_name, subject, node_key, completed_at")
    .order("completed_at", { ascending: true });
  if (error) throw new Error(`Could not load progress: ${error.message}`);
  return data;
}

function displayName(accountId, accountName) {
  return accountName || accountId;
}

// Ranked by total distinct topics completed -- there's no "average score"
// concept here (no grading), so unlike MCQ this is a single ranking, not
// two. Computed both overall and per subject, same "same way" shape.
export async function getLeaderboard() {
  const c = requireClient();
  const { data, error } = await c.from(TABLE).select("account_id, account_name, subject, node_key");
  if (error) throw new Error(`Could not load leaderboard: ${error.message}`);

  function rank(rows) {
    const byAccount = new Map();
    for (const row of rows) {
      if (!byAccount.has(row.account_id)) {
        byAccount.set(row.account_id, { accountId: row.account_id, name: displayName(row.account_id, row.account_name), topicsCompleted: 0 });
      }
      byAccount.get(row.account_id).topicsCompleted += 1;
    }
    return [...byAccount.values()].sort((a, b) => b.topicsCompleted - a.topicsCompleted);
  }

  const overall = rank(data);

  const bySubject = {};
  const rowsBySubject = new Map();
  for (const row of data) {
    if (!rowsBySubject.has(row.subject)) rowsBySubject.set(row.subject, []);
    rowsBySubject.get(row.subject).push(row);
  }
  for (const [subject, rows] of rowsBySubject) {
    bySubject[subject] = rank(rows);
  }

  return { overall, bySubject };
}

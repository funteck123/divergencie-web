import { randomUUID } from "crypto";
import { supabase } from "./db-supabase";

// TKT-0278: force-delete-with-backup. Two tiers of delete already existed
// as of this file's creation: DELETE /api/users blocks outright if
// userHasHistory() finds anything (unchanged, still the default). This
// file is the NEW second tier -- an explicit, opt-in "force" cascade that
// actually removes every real reference to the account across every
// collection AND the separate Supabase tables outside the COLLECTIONS
// aggregate (mcq_attempts/mcq_mistakes/mcq_question_responses, auditlog),
// but only after writing everything about to be deleted into
// deleted_account_backups first -- see
// data/tmp/migration_deleted_account_backups.sql (not yet applied
// anywhere, must be run once before this is used) -- so the action is
// reversible via restoreDeletedAccount() below, not a one-way door.

// Collections whose rows reference a user, and how -- same fields
// userHasHistory() in app/api/users/route.js already checks, gathered
// here instead of just checked, plus the ones that guard deliberately
// does NOT check (regForms, tickets, apiKeys) since force-delete needs to
// remove ALL of them, not just decide whether to refuse.
const REFERENCING_COLLECTIONS = [
  ["enrollments", (r, userId) => r.UserID === userId],
  ["invoices", (r, userId) => r.StudentID === userId],
  ["paychecks", (r, userId) => r.StaffID === userId],
  ["attendanceItems", (r, userId) => r.UserID === userId || r.LoggedBy === userId],
  ["trialItems", (r, userId) => r.TrialAccID === userId],
  ["interviewItems", (r, userId) => r.InterviewAccID === userId],
  ["regForms", (r, userId) => r.CreatedUserID === userId],
  ["tickets", (r, userId) => r.SenderUserID === userId || r.ClosedBy === userId],
  ["apiKeys", (r, userId) => r.UserID === userId],
];
// idField per collection, needed to build the delete-by-ids call --
// mirrors lib/db-supabase.js's own COLLECTIONS map (not imported directly,
// that map is module-private there; kept in sync by hand, same as
// userHasHistory's own field list already was).
const ID_FIELD = {
  enrollments: "EnrolmentID",
  invoices: "InvoiceID",
  paychecks: "PaycheckID",
  attendanceItems: "AttendanceID",
  trialItems: "TrialID",
  interviewItems: "InterviewID",
  regForms: "RegFormID",
  tickets: "TicketID",
  apiKeys: "ApiKeyID",
};

// Separate Supabase tables outside the COLLECTIONS/read_full_db()
// aggregate -- queried and deleted directly, same pattern
// scores.mjs/lib/logging.js already use for these exact tables.
const DIRECT_TABLES = [
  { table: "mcq_attempts", accountField: "account_id" },
  { table: "mcq_mistakes", accountField: "account_id" },
  { table: "mcq_question_responses", accountField: "account_id" },
];

async function gatherAuditLogRows(userId) {
  // auditlog stores its record as a JSONB `data` column (see
  // lib/logging.js) -- `data->>ActorUserID` is Postgres JSON text-extract,
  // PostgREST exposes it as the `->>ActorUserID` filter path.
  const { data, error } = await supabase.from("auditlog").select("*").eq("data->>ActorUserID", userId);
  if (error) throw new Error(`[accountDeletion] gather auditlog: ${error.message}`);
  return data || [];
}

// Gathers EVERY row anywhere that references this account, across both the
// COLLECTIONS aggregate (db, already loaded by the caller) and the direct
// tables. Returns { snapshot, parentsToClean } -- snapshot is the exact
// shape stored in deleted_account_backups.snapshot; parentsToClean is the
// list of Parent users whose StudentIDs array needs this id removed (the
// parent itself is NOT deleted, only detached).
export async function gatherAccountRelatedRecords(db, userId) {
  const snapshot = {};
  for (const [key, matches] of REFERENCING_COLLECTIONS) {
    const rows = (db[key] || []).filter((r) => matches(r, userId));
    if (rows.length > 0) snapshot[key] = rows;
  }
  const parentsToClean = db.users.filter((u) => u.UserType === "Parent" && (u.StudentIDs || []).includes(userId));
  if (parentsToClean.length > 0) snapshot.parentStudentIdLinks = parentsToClean.map((p) => p.UserID);

  for (const { table, accountField } of DIRECT_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq(accountField, userId);
    if (error) throw new Error(`[accountDeletion] gather ${table}: ${error.message}`);
    if ((data || []).length > 0) snapshot[table] = data;
  }
  const auditRows = await gatherAuditLogRows(userId);
  if (auditRows.length > 0) snapshot.auditlog = auditRows;

  return { snapshot, parentsToClean };
}

// Deletes exactly the rows a prior gatherAccountRelatedRecords() call found
// -- takes the already-built snapshot rather than re-querying, so a
// force-delete never risks deleting rows that weren't backed up (backup
// and delete always act on the identical row set).
export async function deleteGatheredRecords(snapshot, parentsToClean, userId, deleteRecords) {
  const collectionDeletions = REFERENCING_COLLECTIONS
    .map(([key]) => key)
    .filter((key) => snapshot[key]?.length > 0)
    .map((key) => ({ collection: key, ids: snapshot[key].map((r) => r[ID_FIELD[key]]) }));
  if (collectionDeletions.length > 0) await deleteRecords(collectionDeletions);

  for (const { table } of DIRECT_TABLES) {
    if (!snapshot[table]?.length) continue;
    const ids = snapshot[table].map((r) => r.id);
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) throw new Error(`[accountDeletion] delete ${table}: ${error.message}`);
  }
  if (snapshot.auditlog?.length > 0) {
    const ids = snapshot.auditlog.map((r) => r.id);
    const { error } = await supabase.from("auditlog").delete().in("id", ids);
    if (error) throw new Error(`[accountDeletion] delete auditlog: ${error.message}`);
  }

  // Detach, don't delete: a Parent losing a StudentID reference stays a
  // real account with its own real history, just no longer pointing at
  // this now-deleted student.
  for (const parent of parentsToClean) {
    parent.StudentIDs = (parent.StudentIDs || []).filter((id) => id !== userId);
  }
}

export async function writeDeletionBackup({ userId, userName, userType, snapshot, deletedBy }) {
  const backupId = `DELBK-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("deleted_account_backups").insert({
    backup_id: backupId,
    user_id: userId,
    user_name: userName || null,
    user_type: userType || null,
    snapshot,
    deleted_by: deletedBy,
  });
  if (error) throw new Error(`[accountDeletion] writeDeletionBackup: ${error.message}`);
  return backupId;
}

export async function listDeletionBackups() {
  const { data, error } = await supabase
    .from("deleted_account_backups")
    .select("backup_id, user_id, user_name, user_type, deleted_at, deleted_by, restored_at, restored_by")
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(`[accountDeletion] listDeletionBackups: ${error.message}`);
  return data || [];
}

export async function getDeletionBackup(backupId) {
  const { data, error } = await supabase.from("deleted_account_backups").select("*").eq("backup_id", backupId).maybeSingle();
  if (error) throw new Error(`[accountDeletion] getDeletionBackup: ${error.message}`);
  return data;
}

// Direct-table restore: auditlog rows carry their own real `id` (a string
// mcq_attempts/mcq_mistakes/mcq_question_responses row carries its own uuid/
// bigserial `id` too) -- upsert on that same id so a restore is idempotent
// (running it twice doesn't duplicate rows) rather than a plain insert.
async function restoreDirectTableRows(table, rows) {
  if (!rows?.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`[accountDeletion] restore ${table}: ${error.message}`);
}

// Re-inserts everything a snapshot (from gatherAccountRelatedRecords, as
// stored in deleted_account_backups.snapshot) originally held. `db` is a
// fresh readDB() result the caller loaded; this mutates it in place and
// the caller is responsible for calling writeDB() with the returned list
// of touched collection keys (mirrors how every other route in this app
// already owns its own readDB()/writeDB() pair, restore is not special).
export async function restoreFromSnapshot(db, snapshot) {
  const touchedCollections = [];
  for (const [key] of REFERENCING_COLLECTIONS) {
    const rows = snapshot[key];
    if (!rows?.length) continue;
    const idField = ID_FIELD[key];
    const existingIds = new Set((db[key] || []).map((r) => r[idField]));
    for (const row of rows) {
      if (!existingIds.has(row[idField])) db[key].push(row);
    }
    touchedCollections.push(key);
  }
  if (snapshot.parentStudentIdLinks?.length > 0) {
    for (const parentId of snapshot.parentStudentIdLinks) {
      const parent = db.users.find((u) => u.UserID === parentId);
      if (parent && !(parent.StudentIDs || []).includes(snapshot.users?.[0]?.UserID)) {
        parent.StudentIDs = [...(parent.StudentIDs || []), snapshot.users[0].UserID];
      }
    }
    touchedCollections.push("users");
  }
  for (const { table } of DIRECT_TABLES) {
    await restoreDirectTableRows(table, snapshot[table]);
  }
  await restoreDirectTableRows("auditlog", snapshot.auditlog);
  return touchedCollections;
}

export async function markDeletionBackupRestored(backupId, restoredBy) {
  const { error } = await supabase
    .from("deleted_account_backups")
    .update({ restored_at: new Date().toISOString(), restored_by: restoredBy })
    .eq("backup_id", backupId);
  if (error) throw new Error(`[accountDeletion] markDeletionBackupRestored: ${error.message}`);
}

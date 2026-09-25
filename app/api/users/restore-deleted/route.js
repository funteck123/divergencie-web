import { NextResponse } from "next/server";
import { readDB, writeDB, saveUserAndCredentials } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";
import { listDeletionBackups, getDeletionBackup, markDeletionBackupRestored, restoreFromSnapshot } from "@/lib/accountDeletion";

// TKT-0278: the undo side of DELETE /api/users' force-delete path. Lists
// every backup (GET), or restores one exactly as it was (POST) -- the
// account, its credentials, and every row that was cascaded away with it.

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;
  const backups = await listDeletionBackups();
  return NextResponse.json({ backups });
}

// body: { backupId }
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { backupId } = await req.json();
  if (!backupId) return NextResponse.json({ error: "backupId is required." }, { status: 400 });

  const backup = await getDeletionBackup(backupId);
  if (!backup) return NextResponse.json({ error: "Backup not found." }, { status: 404 });
  if (backup.restored_at) return NextResponse.json({ error: "This backup was already restored." }, { status: 400 });

  const { snapshot } = backup;
  const user = snapshot.users?.[0];
  if (!user) return NextResponse.json({ error: "Backup has no user snapshot -- cannot restore." }, { status: 500 });

  const db = await readDB();
  if (db.users.some((u) => u.UserID === user.UserID)) {
    return NextResponse.json({ error: `A user with id ${user.UserID} already exists -- cannot restore over it.` }, { status: 409 });
  }

  // Real accounts/credentials go through the same dedicated fast path
  // TKT-0084 already built for single-user writes, not a full-table
  // writeDB(). Every OTHER referencing collection restores via the
  // general readDB()/mutate/writeDB() cycle, same as any other route.
  await saveUserAndCredentials(user, snapshot.credentials?.[0] || null);
  const touchedCollections = await restoreFromSnapshot(db, snapshot);
  if (touchedCollections.length > 0) await writeDB(db, touchedCollections);

  await markDeletionBackupRestored(backupId, session.userId);
  await logAudit({
    actorUserId: session.userId,
    action: "restore",
    entityType: "User",
    entityId: user.UserID,
    summary: `Restored ${user.UserType} "${user.Name}" from backup ${backupId}`,
    snapshot: user,
  });

  return NextResponse.json({ ok: true, user });
}

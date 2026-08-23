import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { extractDriveFolderId, listDriveFolderFiles } from "@/lib/googleDrive";
import { readDB } from "@/lib/db";

// SECURITY: this used to accept ANY link param and list it, with only a
// comment claiming (not enforcing) that it "only ever lists a folder the
// account can already reach directly" — the handler itself never checked
// that. Confirmed as a real gap in a red-team pass (2026-08-24): any
// authenticated account, any role, could pass any Drive folder link/ID.
// The real authorization source of truth, matching what every dashboard's
// own ResourcesSection actually uses (Student/Teacher/Staff/Ambassador all
// pass their own enrolledServices, built from db.enrollments filtered to
// the caller's own userId — see components/ResourcesSection.jsx), is: the
// account's own enrollments' Services' WorksheetsLink, checked here too.
export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const link = new URL(req.url).searchParams.get("link") || "";
  const folderId = extractDriveFolderId(link);
  if (!folderId) {
    return NextResponse.json({ error: "Not a recognizable Google Drive folder link." }, { status: 400 });
  }

  const db = await readDB();
  const myServiceIds = new Set(db.enrollments.filter((e) => e.UserID === session.userId).map((e) => e.ServiceID));
  const entitled = db.services.some(
    (s) => myServiceIds.has(s.ServiceID) && extractDriveFolderId(s.WorksheetsLink || "") === folderId
  );
  if (!entitled) {
    return NextResponse.json({ error: "Not authorized to view this folder." }, { status: 403 });
  }

  try {
    const files = await listDriveFolderFiles(folderId);
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";
import { cleanRecording, visibleRecordings } from "@/lib/recordings";

// Recording Library (TKT-0358). GET: any signed-in user; the list is already cut down to what that user may see
// (see lib/recordings.js). POST: Management only, adds or updates videos by YouTube id.

export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const db = await readDB();
  return NextResponse.json({ recordings: visibleRecordings(db, session) });
}

// body: { recordings: [{ YouTubeId, Title, Level, Subject, SubjectCode, ChapterNo, ChapterName, Date, Batch, DurationMin, Hidden? }] }
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.recordings) || body.recordings.length === 0) {
    return NextResponse.json({ error: "recordings must be a non-empty array." }, { status: 400 });
  }
  if (body.recordings.length > 500) return NextResponse.json({ error: "At most 500 recordings per request." }, { status: 400 });
  const clean = body.recordings.map(cleanRecording);
  const rejected = clean.map((c, i) => (c ? null : i)).filter((i) => i !== null);
  if (rejected.length) return NextResponse.json({ error: `Rejected recordings at positions ${rejected.join(", ")}: each needs a valid 11-character YouTube id, a title and a subject code. Nothing was saved.` }, { status: 400 });
  const db = await readDB();
  db.recordings = db.recordings || [];
  let added = 0;
  for (const r of clean) {
    const i = db.recordings.findIndex((x) => x.RecordingID === r.RecordingID);
    if (i >= 0) db.recordings[i] = r;
    else { db.recordings.push(r); added++; }
  }
  await writeDB(db, ["recordings"]);
  return NextResponse.json({ added, updated: clean.length - added, total: db.recordings.length });
}

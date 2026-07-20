import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";

// Guides are static named-link buttons ("Student Handbook", "How to book a
// trial", etc.) Management can point at any URL and target at one or more
// portal UserTypes — not tied to any Service/enrollment, unlike
// ResourcesSection's per-Service links. GET is any authenticated user (each
// dashboard filters to its own UserType via /api/me, see there) since
// Guides carry nothing sensitive; writes are Management-only.

export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ guides: db.guides || [] });
}

// body: { name, url, userTypes: string[] }
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { name, url, userTypes } = await req.json();
  if (!name || !url || !Array.isArray(userTypes) || userTypes.length === 0) {
    return NextResponse.json({ error: "name, url, and at least one userType are required." }, { status: 400 });
  }

  const db = await readDB();
  const guide = { GuideID: nextId(db, "GDE"), Name: name, Url: url, UserTypes: userTypes };
  db.guides = db.guides || [];
  db.guides.push(guide);
  await writeDB(db);
  return NextResponse.json({ guide });
}

// body: { guideId, name?, url?, userTypes? }
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { guideId, name, url, userTypes } = await req.json();
  if (!guideId) return NextResponse.json({ error: "guideId is required." }, { status: 400 });

  const db = await readDB();
  const guide = (db.guides || []).find((g) => g.GuideID === guideId);
  if (!guide) return NextResponse.json({ error: "Guide not found." }, { status: 404 });

  if (name !== undefined) guide.Name = name;
  if (url !== undefined) guide.Url = url;
  if (userTypes !== undefined) guide.UserTypes = userTypes;
  await writeDB(db);
  return NextResponse.json({ guide });
}

// body: { guideId }
export async function DELETE(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { guideId } = await req.json();
  if (!guideId) return NextResponse.json({ error: "guideId is required." }, { status: 400 });

  const db = await readDB();
  db.guides = (db.guides || []).filter((g) => g.GuideID !== guideId);
  await writeDB(db);
  return NextResponse.json({ ok: true });
}

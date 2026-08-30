import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";

// TKT-0160: a single global on/off switch per Student-portal Resources
// feature (Recordings/Syllabus/Worksheets/GCR/Timesheet/Progress Tracker),
// so a feature can be hidden without a code change every time (Recordings
// specifically, pending a real recordings digitizer). One fixed row
// (ID "GLOBAL") holding all six flags — there's no per-record concept
// here, just one shared settings object, same reasoning as the
// resourcetoggles table itself (see data/tmp/migration_resource_toggles.sql).
const TOGGLE_ID = "GLOBAL";
export const RESOURCE_FEATURE_KEYS = ["recordings", "syllabus", "worksheets", "gcr", "timesheet", "progressTracker"];

function defaultToggles() {
  // Every feature defaults ON except Recordings, which TKT-0160 asked to
  // disable now (a real recordings digitizer is planned separately).
  return Object.fromEntries(RESOURCE_FEATURE_KEYS.map((k) => [k, k !== "recordings"]));
}

// GET is any authenticated user (every dashboard using ResourcesSection
// needs to read these, not just Management) — the flags carry nothing
// sensitive, same reasoning as GET /api/guides.
export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  const row = (db.resourceToggles || []).find((r) => r.ID === TOGGLE_ID);
  return NextResponse.json({ toggles: { ...defaultToggles(), ...(row || {}) } });
}

// body: { [featureKey]: boolean, ... } — only the keys being changed need
// to be sent; anything omitted keeps its current (or default) value.
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const body = await req.json();
  const invalidKey = Object.keys(body).find((k) => !RESOURCE_FEATURE_KEYS.includes(k));
  if (invalidKey) {
    return NextResponse.json({ error: `Unknown resource feature "${invalidKey}".` }, { status: 400 });
  }

  const db = await readDB();
  db.resourceToggles = db.resourceToggles || [];
  let row = db.resourceToggles.find((r) => r.ID === TOGGLE_ID);
  if (!row) {
    row = { ID: TOGGLE_ID, ...defaultToggles() };
    db.resourceToggles.push(row);
  }
  for (const [key, value] of Object.entries(body)) {
    row[key] = Boolean(value);
  }
  await writeDB(db, ["resourceToggles"]);

  return NextResponse.json({ toggles: { ...defaultToggles(), ...row } });
}

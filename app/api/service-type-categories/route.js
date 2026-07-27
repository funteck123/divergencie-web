import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { ALL_GROUPS } from "@/app/api/services/route";

// The set of Service Type categories that always show their own row in the
// admin Services table for a given Group — even with zero services under
// them (e.g. "Admissions" shows up empty for Student until one exists). A
// Type actually present in the data always shows regardless of whether
// it's in this list (see ServiceGroupTable in the admin dashboard); this is
// only for the placeholder/empty categories, and is fully Management-
// editable rather than a fixed set baked into the code.
const DEFAULT_CATEGORIES = {
  Student: ["Book", "Course", "Counselling", "Admissions"],
  Teacher: [],
  Parent: [],
  Ambassador: [],
  Management: [],
  Staff: [],
};

// Management-only both ways — this only affects Management's own admin
// table/create-form, nothing any other portal reads.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  const rows = db.serviceTypeCategories || [];
  const byGroup = { ...DEFAULT_CATEGORIES };
  for (const row of rows) {
    if (ALL_GROUPS.includes(row.Group)) byGroup[row.Group] = row.Types || [];
  }
  return NextResponse.json({ categories: byGroup });
}

// body: { group, types: string[] } — replaces the whole list for that Group.
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { group, types } = await req.json();
  if (!ALL_GROUPS.includes(group)) {
    return NextResponse.json({ error: `group must be one of ${ALL_GROUPS.join(", ")}.` }, { status: 400 });
  }
  if (!Array.isArray(types) || types.some((t) => !t || typeof t !== "string")) {
    return NextResponse.json({ error: "types must be an array of non-empty strings." }, { status: 400 });
  }

  const db = await readDB();
  db.serviceTypeCategories = db.serviceTypeCategories || [];
  const cleaned = [...new Set(types.map((t) => t.trim()).filter(Boolean))];
  const existing = db.serviceTypeCategories.find((r) => r.Group === group);
  if (existing) {
    existing.Types = cleaned;
  } else {
    db.serviceTypeCategories.push({ Group: group, Types: cleaned });
  }
  await writeDB(db);

  return NextResponse.json({ group, types: cleaned });
}

import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireManagement } from "@/lib/authz";

// TKT-0203: one global on/off switch for auto-approving new RegForm
// submissions. Reuses the resourceToggles collection's single-fixed-row
// pattern (see api/resource-toggles/route.js's own comment for why) instead
// of adding a whole new DB collection for one boolean.
const TOGGLE_ID = "REGISTRATION_SETTINGS";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  const row = (db.resourceToggles || []).find((r) => r.ID === TOGGLE_ID);
  return NextResponse.json({ autoApprove: Boolean(row?.autoApprove) });
}

// body: { autoApprove: boolean }
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { autoApprove } = await req.json();
  const db = await readDB();
  db.resourceToggles = db.resourceToggles || [];
  let row = db.resourceToggles.find((r) => r.ID === TOGGLE_ID);
  if (!row) {
    row = { ID: TOGGLE_ID };
    db.resourceToggles.push(row);
  }
  row.autoApprove = Boolean(autoApprove);
  await writeDB(db, ["resourceToggles"]);

  return NextResponse.json({ autoApprove: row.autoApprove });
}

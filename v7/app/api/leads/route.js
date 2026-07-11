import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";

// Public-facing lead creation (marketing site contact form) — no auth
// required, mirrors v6's src/lib/actions/leads.ts createLead() but backed
// by the same JSON store (later Firestore) as everything else, not Prisma.
// body: { name, email, phone?, source?, notes? }
export async function POST(req) {
  const { name, email, phone, source, notes } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required." }, { status: 400 });
  }

  const db = await readDB();
  const lead = {
    LeadID: nextId(db, "LEAD"),
    Name: name,
    Email: email,
    Phone: phone || "",
    Source: source || "Web Contact Form",
    Notes: notes || "",
    Status: "new",
    CreatedAt: new Date().toISOString(),
  };
  db.leads.push(lead);
  await writeDB(db);
  return NextResponse.json({ lead });
}

// Management-only: read submitted leads.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ leads: db.leads });
}

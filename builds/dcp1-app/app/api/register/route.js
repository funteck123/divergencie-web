import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

// Public endpoint: anyone can submit a RegForm. No account, no schedule pick
// happens here — Management reviews it later and, separately, creates open
// Trial/Interview slots for approved requests to book.
export async function POST(req) {
  const body = await req.json();
  const { name, email, requestedType } = body;

  if (!name || !requestedType) {
    return NextResponse.json({ error: "Name and requested type are required." }, { status: 400 });
  }
  if (!["Trial", "Interview"].includes(requestedType)) {
    return NextResponse.json({ error: "requestedType must be Trial or Interview." }, { status: 400 });
  }

  const db = readDB();
  const regForm = {
    RegFormID: nextId(db, "REG"),
    Name: name,
    Email: email || "",
    RequestedType: requestedType,
    Status: "Pending",
    SubmittedAt: new Date().toISOString(),
  };
  db.regForms.push(regForm);
  writeDB(db);

  return NextResponse.json({ regForm });
}

export async function GET() {
  const db = readDB();
  return NextResponse.json({ regForms: db.regForms });
}

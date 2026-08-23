import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireManagement } from "@/lib/authz";
import { checkRegisterRateLimit } from "@/lib/rateLimit";

// Public endpoint: anyone can submit a RegForm. No account, no schedule pick
// happens here — Management reviews it later and, separately, creates open
// Trial/Interview slots for approved requests to book.
export async function POST(req) {
  // Red-team pass (2026-08-24): 5 rapid POSTs, no throttle, all created
  // real (if disposable-looking) RegForm rows -- an unauthenticated spam
  // vector against the queue Management has to review.
  const rateLimited = checkRegisterRateLimit(req);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const { name, email, requestedType } = body;

  if (!name || !requestedType) {
    return NextResponse.json({ error: "Name and requested type are required." }, { status: 400 });
  }
  if (!BOOKING_TYPES.includes(requestedType)) {
    return NextResponse.json({ error: `requestedType must be one of ${BOOKING_TYPES.join(", ")}.` }, { status: 400 });
  }

  const db = await readDB();
  const regForm = {
    RegFormID: await nextId(db, "REG"),
    Name: name,
    Email: email || "",
    RequestedType: requestedType,
    Status: "Pending",
    SubmittedAt: new Date().toISOString(),
  };
  db.regForms.push(regForm);
  await writeDB(db, ["regForms"]);

  return NextResponse.json({ regForm });
}

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ regForms: db.regForms });
}

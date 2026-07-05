import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json({ enrollments: db.enrollments });
}

// body: { userId, serviceId }
export async function POST(req) {
  const { userId, serviceId } = await req.json();
  const db = readDB();

  const user = db.users.find((u) => u.UserID === userId);
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }
  const dup = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  if (dup) return NextResponse.json({ error: "Already enrolled." }, { status: 400 });

  const enrollment = { EnrolmentID: nextId(db, "ENR"), UserID: userId, ServiceID: serviceId };
  db.enrollments.push(enrollment);
  writeDB(db);
  return NextResponse.json({ enrollment });
}

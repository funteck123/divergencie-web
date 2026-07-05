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

// body: { enrolmentId, userId, serviceId }
export async function PATCH(req) {
  const { enrolmentId, userId, serviceId } = await req.json();
  const db = readDB();

  const enrollment = db.enrollments.find((e) => e.EnrolmentID === enrolmentId);
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });

  const nextUserId = userId || enrollment.UserID;
  const nextServiceId = serviceId || enrollment.ServiceID;

  const user = db.users.find((u) => u.UserID === nextUserId);
  const service = db.services.find((s) => s.ServiceID === nextServiceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }
  const dup = db.enrollments.find(
    (e) => e.EnrolmentID !== enrolmentId && e.UserID === nextUserId && e.ServiceID === nextServiceId
  );
  if (dup) return NextResponse.json({ error: "Already enrolled." }, { status: 400 });

  enrollment.UserID = nextUserId;
  enrollment.ServiceID = nextServiceId;
  writeDB(db);
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId }
export async function DELETE(req) {
  const { enrolmentId } = await req.json();
  const db = readDB();
  const index = db.enrollments.findIndex((e) => e.EnrolmentID === enrolmentId);
  if (index === -1) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });

  db.enrollments.splice(index, 1);
  writeDB(db);
  return NextResponse.json({ ok: true });
}

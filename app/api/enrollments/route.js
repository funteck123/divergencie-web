import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { ratesOf } from "@/lib/billing";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ enrollments: db.enrollments });
}

// A Service can offer more than one currency (Service.Rates) — the
// enrollment records which one this particular person is billed in.
// Defaults to the service's first/only currency if none is given.
function resolveCurrency(service, currency) {
  const rates = ratesOf(service);
  if (!currency) return rates[0].Currency;
  if (!rates.some((r) => r.Currency === currency)) {
    return { error: `currency must be one of: ${rates.map((r) => r.Currency).join(", ")}.` };
  }
  return currency;
}

// body: { userId, serviceId, currency? }
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { userId, serviceId, currency } = await req.json();
  const db = await readDB();

  const user = db.users.find((u) => u.UserID === userId);
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }
  const dup = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  if (dup) return NextResponse.json({ error: "Already enrolled." }, { status: 400 });

  const resolved = resolveCurrency(service, currency);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const enrollment = { EnrolmentID: nextId(db, "ENR"), UserID: userId, ServiceID: serviceId, Currency: resolved };
  db.enrollments.push(enrollment);
  await writeDB(db);
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId, userId, serviceId, currency? }
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { enrolmentId, userId, serviceId, currency } = await req.json();
  const db = await readDB();

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

  const resolved = resolveCurrency(service, currency || enrollment.Currency);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });

  enrollment.UserID = nextUserId;
  enrollment.ServiceID = nextServiceId;
  enrollment.Currency = resolved;
  await writeDB(db);
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId }
export async function DELETE(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { enrolmentId } = await req.json();
  const db = await readDB();
  const index = db.enrollments.findIndex((e) => e.EnrolmentID === enrolmentId);
  if (index === -1) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });

  db.enrollments.splice(index, 1);
  await writeDB(db);
  return NextResponse.json({ ok: true });
}

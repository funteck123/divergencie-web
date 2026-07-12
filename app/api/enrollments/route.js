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

// A Service can offer more than one rate, including duplicate currencies
// (e.g. two USD tiers) — the enrollment records which specific rate this
// person is billed at (RateID), not just a currency. Defaults to the
// service's first/only rate if none is given. Currency is cached on the
// enrollment too, purely for display — RateID is what billing actually uses.
function resolveRate(service, rateId) {
  const rates = ratesOf(service);
  if (!rateId) return rates[0];
  const match = rates.find((r) => r.RateID === rateId);
  if (!match) {
    return { error: `rateId must be one of: ${rates.map((r) => `${r.RateID} (${r.Currency} ${r.Rate})`).join(", ")}.` };
  }
  return match;
}

// Start/End Date are plain "YYYY-MM-DD" strings, both optional — no
// StartDate means "active since always", no EndDate means "still ongoing".
// Validated only for format/order, not against any external constraint.
function validateDateRange(startDate, endDate) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !dateRe.test(startDate)) return "startDate must be in YYYY-MM-DD format.";
  if (endDate && !dateRe.test(endDate)) return "endDate must be in YYYY-MM-DD format.";
  if (startDate && endDate && startDate > endDate) return "startDate must not be after endDate.";
  return null;
}

// body: { userId, serviceId, rateId?, startDate?, endDate? }
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { userId, serviceId, rateId, startDate, endDate } = await req.json();
  const db = await readDB();

  const user = db.users.find((u) => u.UserID === userId);
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }
  const dup = db.enrollments.find((e) => e.UserID === userId && e.ServiceID === serviceId);
  if (dup) return NextResponse.json({ error: "Already enrolled." }, { status: 400 });

  const resolved = resolveRate(service, rateId);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const dateError = validateDateRange(startDate, endDate);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const enrollment = {
    EnrolmentID: nextId(db, "ENR"),
    UserID: userId,
    ServiceID: serviceId,
    RateID: resolved.RateID,
    Currency: resolved.Currency,
    StartDate: startDate || "",
    EndDate: endDate || "",
  };
  db.enrollments.push(enrollment);
  await writeDB(db);
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId, userId, serviceId, rateId?, startDate?, endDate? }
// startDate/endDate are always fully replaced when provided (including
// explicit "" to clear one) so a start or end date can be removed after
// being set, not just added — this is meant to be freely editable, per the
// original request, not a one-time-set field.
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { enrolmentId, userId, serviceId, rateId, startDate, endDate } = await req.json();
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

  const resolved = resolveRate(service, rateId || enrollment.RateID);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const nextStartDate = startDate !== undefined ? startDate : enrollment.StartDate;
  const nextEndDate = endDate !== undefined ? endDate : enrollment.EndDate;
  const dateError = validateDateRange(nextStartDate, nextEndDate);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  enrollment.UserID = nextUserId;
  enrollment.ServiceID = nextServiceId;
  enrollment.RateID = resolved.RateID;
  enrollment.Currency = resolved.Currency;
  enrollment.StartDate = nextStartDate || "";
  enrollment.EndDate = nextEndDate || "";
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

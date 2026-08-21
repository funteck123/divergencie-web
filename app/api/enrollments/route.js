import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { batchesOf, ratesOf } from "@/lib/billing";
import { logAudit } from "@/lib/logging";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ enrollments: db.enrollments });
}

// A Service can have more than one Batch, and a Batch can offer more than
// one rate, including duplicate currencies (e.g. two USD tiers) — the
// enrollment records which specific Batch (BatchID) and which specific rate
// within it (RateID) this person is enrolled/billed at. Defaults to the
// service's first Batch/rate if none is given. Currency is cached on the
// enrollment too, purely for display — BatchID+RateID is what billing
// actually uses.
function resolveBatch(service, batchId) {
  const batches = batchesOf(service);
  // A Staff-role Service (Role/Department, no Batches) enrolls directly at
  // the Service level — no batch to pick.
  if (batches.length === 0) return { BatchID: "", BatchName: "" };
  if (!batchId) return batches[0];
  const match = batches.find((b) => b.BatchID === batchId);
  if (!match) {
    return { error: `batchId must be one of: ${batches.map((b) => `${b.BatchID} (${b.BatchName})`).join(", ")}.` };
  }
  return match;
}

function resolveRate(service, batchId, rateId) {
  const rates = ratesOf(service, batchId);
  if (!rateId) return rates[0];
  const match = rates.find((r) => r.RateID === rateId);
  if (!match) {
    return { error: `rateId must be one of: ${rates.map((r) => `${r.RateID} (${r.Currency} ${r.Rate})`).join(", ")}.` };
  }
  return match;
}

// A Rate can carry its own Group (one of ALL_GROUPS) restricting who may
// enroll at it — e.g. a Batch offering a "Teacher" rate alongside a
// "Student" rate on the same Batch. An unset Rate.Group means any account
// type the Service itself is open to may use it.
function rateGroupError(rate, userType) {
  if (rate.Group && rate.Group !== userType) {
    return `This rate is reserved for ${rate.Group} accounts, not ${userType}.`;
  }
  return null;
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

// body: { userId, serviceId, batchId?, rateId?, startDate?, endDate? }
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { userId, serviceId, batchId, rateId, startDate, endDate } = await req.json();
  const db = await readDB();

  const user = db.users.find((u) => u.UserID === userId);
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }

  const resolvedBatch = resolveBatch(service, batchId);
  if (resolvedBatch?.error) return NextResponse.json({ error: resolvedBatch.error }, { status: 400 });

  // A user can hold at most one enrollment per (Service, Batch) — but may
  // hold several across different Batches of the same Service.
  const dup = db.enrollments.find(
    (e) => e.UserID === userId && e.ServiceID === serviceId && e.BatchID === resolvedBatch.BatchID
  );
  if (dup) return NextResponse.json({ error: "Already enrolled in this batch." }, { status: 400 });

  const resolved = resolveRate(service, resolvedBatch.BatchID, rateId);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
  const groupError = rateGroupError(resolved, user.UserType);
  if (groupError) return NextResponse.json({ error: groupError }, { status: 400 });

  const dateError = validateDateRange(startDate, endDate);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const enrollment = {
    EnrolmentID: await nextId(db, "ENR"),
    UserID: userId,
    ServiceID: serviceId,
    BatchID: resolvedBatch.BatchID,
    RateID: resolved.RateID,
    Currency: resolved.Currency,
    StartDate: startDate || "",
    EndDate: endDate || "",
  };
  db.enrollments.push(enrollment);
  await writeDB(db, ["enrollments"]);
  await logAudit({ actorUserId: session.userId, action: "create", entityType: "Enrollment", entityId: enrollment.EnrolmentID, summary: `Enrolled ${userId} in ${serviceId}`, snapshot: enrollment });
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId, userId, serviceId, batchId?, rateId?, startDate?, endDate? }
// startDate/endDate are always fully replaced when provided (including
// explicit "" to clear one) so a start or end date can be removed after
// being set, not just added — this is meant to be freely editable, per the
// original request, not a one-time-set field.
export async function PATCH(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { enrolmentId, userId, serviceId, batchId, rateId, startDate, endDate } = await req.json();
  const db = await readDB();

  const enrollment = db.enrollments.find((e) => e.EnrolmentID === enrolmentId);
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  const before = JSON.parse(JSON.stringify(enrollment));

  const nextUserId = userId || enrollment.UserID;
  const nextServiceId = serviceId || enrollment.ServiceID;

  const user = db.users.find((u) => u.UserID === nextUserId);
  const service = db.services.find((s) => s.ServiceID === nextServiceId);
  if (!user || !service) {
    return NextResponse.json({ error: "User or Service not found." }, { status: 404 });
  }

  const resolvedBatch = resolveBatch(service, batchId || enrollment.BatchID);
  if (resolvedBatch?.error) return NextResponse.json({ error: resolvedBatch.error }, { status: 400 });

  const dup = db.enrollments.find(
    (e) =>
      e.EnrolmentID !== enrolmentId &&
      e.UserID === nextUserId &&
      e.ServiceID === nextServiceId &&
      e.BatchID === resolvedBatch.BatchID
  );
  if (dup) return NextResponse.json({ error: "Already enrolled in this batch." }, { status: 400 });

  const resolved = resolveRate(service, resolvedBatch.BatchID, rateId || enrollment.RateID);
  if (resolved?.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
  const groupError = rateGroupError(resolved, user.UserType);
  if (groupError) return NextResponse.json({ error: groupError }, { status: 400 });

  const nextStartDate = startDate !== undefined ? startDate : enrollment.StartDate;
  const nextEndDate = endDate !== undefined ? endDate : enrollment.EndDate;
  const dateError = validateDateRange(nextStartDate, nextEndDate);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  enrollment.UserID = nextUserId;
  enrollment.ServiceID = nextServiceId;
  enrollment.BatchID = resolvedBatch.BatchID;
  enrollment.RateID = resolved.RateID;
  enrollment.Currency = resolved.Currency;
  enrollment.StartDate = nextStartDate || "";
  enrollment.EndDate = nextEndDate || "";
  await writeDB(db, ["enrollments"]);
  await logAudit({ actorUserId: session.userId, action: "edit", entityType: "Enrollment", entityId: enrollment.EnrolmentID, summary: `Edited enrollment ${enrollment.EnrolmentID}`, snapshot: { before, after: enrollment } });
  return NextResponse.json({ enrollment });
}

// body: { enrolmentId }
export async function DELETE(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { enrolmentId } = await req.json();
  const db = await readDB();
  const index = db.enrollments.findIndex((e) => e.EnrolmentID === enrolmentId);
  if (index === -1) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });

  const [deleted] = db.enrollments.splice(index, 1);
  await deleteRecords(db, [{ collection: "enrollments", ids: [enrolmentId] }]);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "Enrollment", entityId: enrolmentId, summary: `Deleted enrollment ${enrolmentId}`, snapshot: deleted });
  return NextResponse.json({ ok: true });
}

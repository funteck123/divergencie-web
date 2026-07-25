import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";
import { requireSession, requireManagement } from "@/lib/authz";
import { CURRENCIES } from "@/lib/accountTypes";
import { BILLING_TYPES } from "@/lib/billing";

export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  if (ensureScheduleGenerated(db) > 0) await writeDB(db);
  return NextResponse.json({ services: db.services });
}

// A Service's Group is an array of the account types it's open to — gates
// who can book/enroll it (Trial accounts only see ones including Student,
// Interview accounts only ones including Staff).
export const ALL_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"];

function isValidGroup(group) {
  return Array.isArray(group) && group.length > 0 && group.every((g) => ALL_GROUPS.includes(g));
}

// A Service can now offer more than one rate — whoever enrolls in it picks
// one specific rate (see /api/enrollments), not just a currency, since two
// rates can share the same currency (e.g. two different USD tiers). Accepts
// either the current { currency, rate, rateId? }[] shape, or (for any older
// caller) a single top-level currency/rate pair, normalized into a
// one-entry list.
function normalizeRates(body) {
  if (Array.isArray(body.rates)) return body.rates;
  if (body.rate !== undefined || body.currency !== undefined) {
    return [{ currency: body.currency, rate: body.rate }];
  }
  return [];
}

function validateRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) {
    return "At least one rate is required.";
  }
  for (const r of rates) {
    const currency = r.currency || "INR";
    if (!CURRENCIES.includes(currency)) {
      return `currency must be one of ${CURRENCIES.join(", ")}.`;
    }
    if (Number(r.rate) < 0 || Number.isNaN(Number(r.rate))) {
      return "rate cannot be negative.";
    }
    if (r.description && String(r.description).length > 40) {
      return "A rate's description must be 40 characters or fewer.";
    }
    if (r.billingType && !BILLING_TYPES.includes(r.billingType)) {
      return `billingType must be one of ${BILLING_TYPES.join(", ")}.`;
    }
  }
  return null;
}

// Rates are replaced wholesale, same pattern as occurrences: a rate that
// already has a rateId (an existing rate being edited/kept) keeps it, so
// Enrollments already pointing at it stay valid; a new rate gets a fresh id.
function toStoredRates(db, rates) {
  return rates.map((r) => ({
    RateID: r.rateId || nextId(db, "RATE"),
    Currency: r.currency || "INR",
    Rate: Number(r.rate) || 0,
    Description: (r.description || "").trim(),
    BillingType: r.billingType || "Monthly",
  }));
}

// Rate + Currency is the one billing field every service has now, regardless
// of Group — Compensation/MonthlyCost was a separate term for the same
// concept and has been removed. Batch/Board/Subject fields are still
// Student/Teacher-only (a service's curriculum details, not its billing).
function hasCohortFields(group) {
  return group.includes("Student") || group.includes("Teacher");
}

function applyCohortServiceFields(service, body, group) {
  if (hasCohortFields(group)) {
    service.Batch = body.batch || "";
    service.Board = body.board || "";
    service.CourseClass = body.courseClass || "";
    service.SubjectCode = body.subjectCode || "";
    service.SubjectName = body.subjectName || "";
    service.FullSubjectName = body.fullSubjectName || "";
  } else {
    for (const key of ["Batch", "Board", "CourseClass", "SubjectCode", "SubjectName", "FullSubjectName"]) {
      delete service[key];
    }
  }
}

// Resource links (Recordings/Syllabus/Worksheets/Google Classroom) shown on
// the Student Resources section — only meaningful for services actually
// open to Student, same gating pattern as the cohort fields above.
function applyStudentLinkFields(service, body, group) {
  if (group.includes("Student")) {
    service.RecordingsLink = (body.recordingsLink || "").trim();
    service.SyllabusLink = (body.syllabusLink || "").trim();
    service.WorksheetsLink = (body.worksheetsLink || "").trim();
    service.GCRLink = (body.gcrLink || "").trim();
  } else {
    for (const key of ["RecordingsLink", "SyllabusLink", "WorksheetsLink", "GCRLink"]) {
      delete service[key];
    }
  }
}

// body: { name, type, group: string[] (subset of ALL_GROUPS),
//         rates: [{ currency, rate }] (at least one, duplicate currencies allowed),
//         batch?, board?, courseClass?, subjectCode?, subjectName?, fullSubjectName?
//         (Student/Teacher-only), occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. A service can belong to several groups at once. Cohort-only fields
// are silently dropped if sent for a service not open to Student/Teacher.
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { name, type, group, occurrences } = body;
  const rates = normalizeRates(body);

  if (!name || !type || !isValidGroup(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: `name, type, group (non-empty subset of ${ALL_GROUPS.join(", ")}), and at least one occurrence are required.` },
      { status: 400 }
    );
  }
  const ratesError = validateRates(rates);
  if (ratesError) return NextResponse.json({ error: ratesError }, { status: 400 });

  const db = await readDB();

  const serviceId = nextId(db, "SVC");
  const occuranceList = occurrences.map((o) => ({
    OccuranceID: nextId(db, "OCC"),
    Day: o.day,
    Time: o.time,
    Duration: Number(o.duration),
    Facilitator: o.facilitator,
  }));

  const storedRates = toStoredRates(db, rates);
  const service = {
    ServiceID: serviceId,
    Type: type,
    Group: group,
    Name: name,
    Rates: storedRates,
    // Kept in sync with Rates[0] for any display code still reading the
    // singular fields directly.
    Currency: storedRates[0].Currency,
    Rate: storedRates[0].Rate,
    OccuranceList: occuranceList,
  };
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);
  db.services.push(service);
  ensureScheduleGenerated(db);
  await writeDB(db);

  return NextResponse.json({ service });
}

// body: { serviceId, name, type, group, rates: [{ rateId?, currency, rate }],
//         occurrences: [{occuranceId?, day, time, duration, facilitator}], + the Student/Teacher-only fields listed above }
// Occurrences and rates are both replaced wholesale: existing ones keep
// their id (so already-generated ScheduleItems / existing Enrollments still
// trace back to them), new ones get a fresh id. Already-generated
// ScheduleItems are historical and are never rewritten — edits only change
// what ensureScheduleGenerated produces going forward. Student/Teacher-only
// fields are dropped if the Service is edited to a Group without either.
//
// Removing a rate that an existing Enrollment already uses is allowed —
// that enrollment's own RateID is untouched and its billing keeps using
// whatever rate it locked in until Management changes the enrollment itself
// (see /api/enrollments); it just won't be offered to new enrollments.
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { serviceId, name, type, group, occurrences } = body;
  const rates = normalizeRates(body);

  if (!serviceId || !name || !type || !isValidGroup(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: `serviceId, name, type, group (non-empty subset of ${ALL_GROUPS.join(", ")}), and at least one occurrence are required.` },
      { status: 400 }
    );
  }
  const ratesError = validateRates(rates);
  if (ratesError) return NextResponse.json({ error: ratesError }, { status: 400 });

  const db = await readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const storedRates = toStoredRates(db, rates);
  service.Name = name;
  service.Type = type;
  service.Group = group;
  service.Rates = storedRates;
  service.Currency = storedRates[0].Currency;
  service.Rate = storedRates[0].Rate;
  delete service.Code;
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);
  service.OccuranceList = occurrences.map((o) => ({
    OccuranceID: o.occuranceId || nextId(db, "OCC"),
    Day: o.day,
    Time: o.time,
    Duration: Number(o.duration),
    Facilitator: o.facilitator,
  }));

  ensureScheduleGenerated(db);
  await writeDB(db);

  return NextResponse.json({ service });
}

// Only allowed if no enrollment has ever referenced this Service — ended
// enrollments count too, not just currently-active ones, since an ended
// enrollment still means real billing/attendance history exists for it.
// Deleting also removes its auto-generated ScheduleItems (regenerable,
// no independent value) — but never touches enrollments/invoices/paychecks
// themselves, since the block above guarantees none exist for this Service.
export async function DELETE(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { serviceId } = await req.json();
  if (!serviceId) return NextResponse.json({ error: "serviceId is required." }, { status: 400 });

  const db = await readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const enrollmentCount = db.enrollments.filter((e) => e.ServiceID === serviceId).length;
  if (enrollmentCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${enrollmentCount} enrollment${enrollmentCount === 1 ? "" : "s"} (past or present) reference this Service.` },
      { status: 409 }
    );
  }

  db.services = db.services.filter((s) => s.ServiceID !== serviceId);
  db.scheduleItems = db.scheduleItems.filter((s) => s.ServiceID !== serviceId);
  await writeDB(db);

  return NextResponse.json({ ok: true });
}

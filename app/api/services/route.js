import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";
import { requireSession, requireManagement } from "@/lib/authz";
import { CURRENCIES, DEPARTMENTS } from "@/lib/accountTypes";
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

// A Rate optionally carries its own single Group (one of ALL_GROUPS) — when
// set, only a user of that account type may enroll at that rate (see
// /api/enrollments). Unset means any group the Service itself is open to.
function isValidRateGroup(g) {
  return g === undefined || g === "" || ALL_GROUPS.includes(g);
}

function validateRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) {
    return "Each batch needs at least one rate.";
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
    if (!isValidRateGroup(r.group)) {
      return `A rate's group must be one of ${ALL_GROUPS.join(", ")}, or left unset.`;
    }
  }
  return null;
}

function validateOccurrences(occurrences) {
  return Array.isArray(occurrences) && occurrences.length > 0;
}

function validateBatches(batches) {
  if (!Array.isArray(batches) || batches.length === 0) {
    return "At least one batch is required.";
  }
  for (const b of batches) {
    if (!b.batchName) return "Each batch needs a name.";
    if (!validateOccurrences(b.occurrences)) return "Each batch needs at least one occurrence.";
    const ratesError = validateRates(b.rates);
    if (ratesError) return ratesError;
  }
  return null;
}

// Rates/Occurrences are replaced wholesale within a batch, same as before:
// one that already has an id (existing, being edited/kept) keeps it, so
// Enrollments/ScheduleItems already pointing at it stay valid; a new one
// gets a fresh id. Batches themselves follow the same rule via batchId.
function toStoredRates(db, rates) {
  return rates.map((r) => ({
    RateID: r.rateId || nextId(db, "RATE"),
    Currency: r.currency || "INR",
    Rate: Number(r.rate) || 0,
    Description: (r.description || "").trim(),
    BillingType: r.billingType || "Monthly",
    Group: r.group || "",
  }));
}

function toStoredOccurrences(db, occurrences) {
  return occurrences.map((o) => ({
    OccuranceID: o.occuranceId || nextId(db, "OCC"),
    Day: o.day,
    Time: o.time,
    Duration: Number(o.duration),
    Facilitator: o.facilitator,
  }));
}

function toStoredBatches(db, batches) {
  return batches.map((b) => ({
    BatchID: b.batchId || nextId(db, "BATCH"),
    BatchName: b.batchName,
    OccuranceList: toStoredOccurrences(db, b.occurrences),
    Rates: toStoredRates(db, b.rates),
  }));
}

function toStoredComponents(db, components) {
  return components.map((c) => ({
    ComponentID: c.componentId || nextId(db, "COMP"),
    ComponentName: (c.componentName || "").trim(),
    Batches: toStoredBatches(db, c.batches),
  }));
}

// A Staff-role Service (an internal role like "Associate Project Manager")
// is open ONLY to Staff — no cohort/batch concept applies to it (there's no
// "class" of students), so it skips the OptionalComponents/Batches nesting
// entirely and keeps Role/Department/Rates/OccuranceList directly on
// itself, same shape as before the Batch redesign.
function isStaffRoleService(group) {
  return group.length === 1 && group[0] === "Staff";
}

function applyStaffRoleFields(db, service, body) {
  service.Role = (body.role || "").trim();
  service.Department = DEPARTMENTS.includes(body.department) ? body.department : "";
  service.Rates = toStoredRates(db, body.rates || []);
  service.OccuranceList = toStoredOccurrences(db, body.occurrences || []);
}

// Course/Curriculum fields are still Student/Teacher-only (a service's
// curriculum details, not its billing) — Rate + Currency is the one billing
// field every service has now, regardless of Group.
function hasCohortFields(group) {
  return group.includes("Student") || group.includes("Teacher");
}

function applyCohortServiceFields(service, body, group) {
  if (hasCohortFields(group)) {
    service.Board = body.board || "";
    service.Course = body.course || "";
    service.SubjectCode = body.subjectCode || "";
    service.SubjectName = body.subjectName || "";
    service.FullSubjectName = body.fullSubjectName || "";
  } else {
    for (const key of ["Board", "Course", "SubjectCode", "SubjectName", "FullSubjectName"]) {
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

// body: { name, type, group: string[] (subset of ALL_GROUPS), board?, course?,
//         subjectCode?, subjectName?, fullSubjectName? (Student/Teacher-only),
//         components: [{ componentName?, batches: [{ batchName, occurrences: [...],
//         rates: [{ currency, rate, billingType?, description?, group? }] }] }] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. A service can belong to several groups at once. Cohort-only fields
// are silently dropped if sent for a service not open to Student/Teacher.
// A Service holds one or more OptionalComponents (e.g. distinct exam papers
// within one subject — most subjects just have a single unnamed component),
// each of which holds one or more Batches, each of which holds its own
// Rates + Occurrences. A Batch is the level someone actually enrolls into:
// they pick a Batch, then a Rate within it (see /api/enrollments).
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { name, type, group, components } = body;

  if (!name || !type || !isValidGroup(group)) {
    return NextResponse.json(
      { error: `name, type, and group (non-empty subset of ${ALL_GROUPS.join(", ")}) are required.` },
      { status: 400 }
    );
  }
  const staffRole = isStaffRoleService(group);
  if (!staffRole) {
    const componentsError = Array.isArray(components) && components.length > 0
      ? components.map((c) => validateBatches(c.batches)).find(Boolean)
      : "At least one component (with at least one batch) is required.";
    if (componentsError) return NextResponse.json({ error: componentsError }, { status: 400 });
  } else {
    const ratesError = validateRates(body.rates || []);
    if (ratesError) return NextResponse.json({ error: ratesError }, { status: 400 });
    if (!validateOccurrences(body.occurrences)) {
      return NextResponse.json({ error: "At least one occurrence is required." }, { status: 400 });
    }
  }

  const db = await readDB();

  const service = {
    ServiceID: nextId(db, "SVC"),
    Type: type,
    Group: group,
    Name: name,
  };
  if (staffRole) {
    applyStaffRoleFields(db, service, body);
  } else {
    service.OptionalComponents = toStoredComponents(db, components);
  }
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);
  db.services.push(service);
  ensureScheduleGenerated(db);
  await writeDB(db);

  return NextResponse.json({ service });
}

// body: { serviceId, name, type, group, components: [{ componentId?, componentName?,
//         batches: [{ batchId?, batchName, occurrences: [{occuranceId?, ...}],
//         rates: [{ rateId?, ... }] }] }], + the Student/Teacher-only fields listed above }
// Components/Batches/Rates/Occurrences are all replaced wholesale each edit:
// anything that already has an id (existing, being kept) keeps it, so
// already-generated ScheduleItems / existing Enrollments still trace back to
// it; anything new gets a fresh id. Already-generated ScheduleItems are
// historical and are never rewritten — edits only change what
// ensureScheduleGenerated produces going forward.
//
// Removing a rate/batch that an existing Enrollment already uses is allowed
// — that enrollment's own BatchID/RateID are untouched and its billing keeps
// using whatever it locked in until Management changes the enrollment itself
// (see /api/enrollments); it just won't be offered to new enrollments.
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { serviceId, name, type, group, components } = body;

  if (!serviceId || !name || !type || !isValidGroup(group)) {
    return NextResponse.json(
      { error: `serviceId, name, type, and group (non-empty subset of ${ALL_GROUPS.join(", ")}) are required.` },
      { status: 400 }
    );
  }
  const staffRole = isStaffRoleService(group);
  if (!staffRole) {
    const componentsError = Array.isArray(components) && components.length > 0
      ? components.map((c) => validateBatches(c.batches)).find(Boolean)
      : "At least one component (with at least one batch) is required.";
    if (componentsError) return NextResponse.json({ error: componentsError }, { status: 400 });
  } else {
    const ratesError = validateRates(body.rates || []);
    if (ratesError) return NextResponse.json({ error: ratesError }, { status: 400 });
    if (!validateOccurrences(body.occurrences)) {
      return NextResponse.json({ error: "At least one occurrence is required." }, { status: 400 });
    }
  }

  const db = await readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  service.Name = name;
  service.Type = type;
  service.Group = group;
  if (staffRole) {
    applyStaffRoleFields(db, service, body);
    delete service.OptionalComponents;
  } else {
    service.OptionalComponents = toStoredComponents(db, components);
    for (const key of ["Role", "Department", "Rates", "OccuranceList"]) delete service[key];
  }
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);

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

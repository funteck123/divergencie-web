import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";
import { requireSession, requireManagement } from "@/lib/authz";
import { CURRENCIES, DEPARTMENTS } from "@/lib/accountTypes";
import { normalizeTimezone } from "@/lib/timezones";
import { BILLING_TYPES, batchFullName } from "@/lib/billing";

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
    // The timezone the Day/Time above are meant in — must always be set,
    // defaulting to IST (Asia/Kolkata) same as normalizeTimezone's own
    // fallback for a User's own Timezone.
    Timezone: normalizeTimezone(o.timezone),
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

// A role-based Service (an internal role like "Associate Project Manager",
// or any simple administrative service open to exactly one non-Student
// group) has no cohort/batch concept — there's no "class" of students — so
// it skips the OptionalComponents/Batches nesting entirely and keeps Role/
// Rates/OccuranceList directly on itself. Department (one of DEPARTMENTS)
// only applies to Staff specifically; the other groups just get Role.
const ROLE_BASED_GROUPS = ["Staff", "Teacher", "Ambassador", "Parent", "Management"];
function isRoleBasedService(group) {
  return group.length === 1 && ROLE_BASED_GROUPS.includes(group[0]);
}

function applyRoleBasedFields(db, service, body, group) {
  service.Role = (body.role || "").trim();
  if (group[0] === "Staff") {
    service.Department = DEPARTMENTS.includes(body.department) ? body.department : "";
  } else {
    delete service.Department;
  }
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
  } else {
    for (const key of ["Board", "Course", "SubjectCode", "SubjectName"]) {
      delete service[key];
    }
  }
  // FullSubjectName used to be typed by hand here — it's now auto-generated
  // (see stampFullNames below) as Batch.FullName instead, so this field is
  // never written anymore. Left in place on any Service that already has it
  // stored from before, but slated for removal from the DB entirely later.
  delete service.FullSubjectName;
}

// Auto-generates the long-form name used on invoice/paycheck line items
// (Batch + Board + SubjectCode + SubjectName — see lib/billing.js's
// batchFullName) and stores it as Batch.FullName, or Service.FullName for a
// Staff-role Service (no Batches, no Board/Subject to compose from — falls
// back to the Service's own Name). Never accepted from the client; always
// recomputed from whatever Board/Subject/Batch values were just saved.
function stampFullNames(service) {
  const components = service.OptionalComponents || [];
  if (components.length > 0) {
    for (const c of components) {
      for (const b of c.Batches || []) {
        b.FullName = batchFullName(service, b);
      }
    }
  } else {
    service.FullName = batchFullName(service, null);
  }
}

// Resource links (Recordings/Syllabus/Worksheets/Google Classroom) shown on
// the account's own Resources section — meaningful for any cohort service
// (Student's own Resources tab AND Teacher's, both read the same fields via
// components/ResourcesSection.jsx), same gating as the cohort fields above.
function applyStudentLinkFields(service, body, group) {
  if (hasCohortFields(group)) {
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

// A freeform, named link list any Service can carry regardless of Type —
// e.g. a Book service attaching a "Questions" link and an "Answers" link
// (one Service, not a separate Service per link, per the Questions/Answers
// merge). Entries missing a name or url are dropped rather than stored
// half-filled. Existing ids are preserved on edit like Rates/Occurrences.
function toStoredLinks(db, links) {
  return (Array.isArray(links) ? links : [])
    .filter((l) => l.name && l.url)
    .map((l) => ({
      LinkID: l.linkId || nextId(db, "LINK"),
      Name: l.name.trim(),
      Url: l.url.trim(),
    }));
}

// University/Country are specific to Admissions-typed services (offer-
// letter/target-university consulting) — gated on Type, not Group, since
// Admissions can in principle be open to any Group.
function applyAdmissionsFields(service, body, type) {
  if (type === "Admissions") {
    service.University = (body.university || "").trim();
    service.Country = (body.country || "").trim();
  } else {
    delete service.University;
    delete service.Country;
  }
}

// body: { name, type, group: string[] (subset of ALL_GROUPS), board?, course?,
//         subjectCode?, subjectName? (Student/Teacher-only),
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
  const roleBased = isRoleBasedService(group);
  if (!roleBased) {
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
  if (roleBased) {
    applyRoleBasedFields(db, service, body, group);
  } else {
    service.OptionalComponents = toStoredComponents(db, components);
  }
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);
  applyAdmissionsFields(service, body, type);
  service.Links = toStoredLinks(db, body.links);
  stampFullNames(service);
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
  const roleBased = isRoleBasedService(group);
  if (!roleBased) {
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
  if (roleBased) {
    applyRoleBasedFields(db, service, body, group);
    delete service.OptionalComponents;
  } else {
    service.OptionalComponents = toStoredComponents(db, components);
    for (const key of ["Role", "Department", "Rates", "OccuranceList"]) delete service[key];
  }
  applyCohortServiceFields(service, body, group);
  applyStudentLinkFields(service, body, group);
  applyAdmissionsFields(service, body, type);
  service.Links = toStoredLinks(db, body.links);
  stampFullNames(service);

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

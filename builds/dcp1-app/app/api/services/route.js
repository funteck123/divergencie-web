import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

export async function GET() {
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);
  return NextResponse.json({ services: db.services });
}

// Short unique identifier for a Service, e.g. "IGCSE Physics" -> "IP". Falls
// back to letters from the name, then a generic prefix, appending a number
// on collision.
function autoServiceCode(name, db, excludeServiceId) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let base = words.map((w) => w[0]).join("").toUpperCase();
  if (base.length < 2) base = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  if (!base) base = "SVC";

  const taken = (code) => db.services.some((s) => s.Code === code && s.ServiceID !== excludeServiceId);
  let candidate = base;
  let n = 1;
  while (taken(candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

// A Service's Group gates who can book it (Trial accounts only see
// Student-eligible ones, Interview accounts only Staff-eligible ones);
// "Both" is eligible for either.
function isStudentEligible(group) {
  return group === "Student" || group === "Both";
}

// Fields that only apply to Student-eligible services (Group Student/Both).
// Rate+Currency replace MonthlyCost/Compensation as the billing amount for
// these — Staff-only services keep MonthlyCost/Compensation unchanged.
function applyStudentOnlyFields(service, body, group) {
  if (isStudentEligible(group)) {
    service.Batch = body.batch || "";
    service.Board = body.board || "";
    service.CourseClass = body.courseClass || "";
    service.SubjectCode = body.subjectCode || "";
    service.SubjectName = body.subjectName || "";
    service.FullSubjectName = body.fullSubjectName || "";
    service.Currency = body.currency || "INR";
    service.Rate = Number(body.rate) || 0;
  } else {
    for (const key of ["Batch", "Board", "CourseClass", "SubjectCode", "SubjectName", "FullSubjectName", "Currency", "Rate"]) {
      delete service[key];
    }
  }
}

// body: { name, type, group: "Student" | "Staff" | "Both", monthlyCost, code? (Staff-only services only),
//         batch?, board?, courseClass?, subjectCode?, subjectName?, fullSubjectName?, currency?, rate?
//         (all Student-eligible-only), occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. "Both" makes a Service bookable by either. Code is a Staff-only
// identifier now (auto-generated from the name unless given manually, must
// be unique) — Student-eligible services use Subject Code instead and never
// carry a Code. Other Student-only fields are silently dropped if sent for
// a Staff-only service.
export async function POST(req) {
  const body = await req.json();
  const { name, type, group, monthlyCost, code, occurrences } = body;

  if (!name || !type || !["Student", "Staff", "Both"].includes(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: "name, type, group (Student/Staff), and at least one occurrence are required." },
      { status: 400 }
    );
  }

  const db = readDB();
  const studentEligible = isStudentEligible(group);

  let finalCode;
  if (!studentEligible) {
    if (code && code.trim()) {
      finalCode = code.trim().toUpperCase();
      if (db.services.some((s) => s.Code === finalCode)) {
        return NextResponse.json({ error: `Code "${finalCode}" is already in use.` }, { status: 400 });
      }
    } else {
      finalCode = autoServiceCode(name, db);
    }
  }

  const serviceId = nextId(db, "SVC");
  const occuranceList = occurrences.map((o) => ({
    OccuranceID: nextId(db, "OCC"),
    Day: o.day,
    Time: o.time,
    Duration: Number(o.duration),
    Facilitator: o.facilitator,
  }));

  const service = {
    ServiceID: serviceId,
    Type: type,
    Group: group,
    Name: name,
    MonthlyCost: Number(monthlyCost) || 0,
    OccuranceList: occuranceList,
  };
  if (finalCode) service.Code = finalCode;
  applyStudentOnlyFields(service, body, group);
  db.services.push(service);
  ensureScheduleGenerated(db);
  writeDB(db);

  return NextResponse.json({ service });
}

// body: { serviceId, name, type, group, monthlyCost, code? (Staff-only services only),
//         occurrences: [{occuranceId?, day, time, duration, facilitator}], + the Student-only fields listed above }
// Occurrences are replaced wholesale: existing ones keep their OccuranceID
// (so already-generated ScheduleItems still trace back to them), new ones
// get a fresh ID. Already-generated ScheduleItems are historical and are
// never rewritten — edits only change what ensureScheduleGenerated produces
// going forward. Code keeps its previous value if not supplied, and is
// dropped entirely if the Service is edited to a Student-eligible Group
// (Subject Code takes over). Other Student-only fields are dropped if the
// Service is edited to a Staff-only Group.
export async function PATCH(req) {
  const body = await req.json();
  const { serviceId, name, type, group, monthlyCost, code, occurrences } = body;

  if (!serviceId || !name || !type || !["Student", "Staff", "Both"].includes(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: "serviceId, name, type, group (Student/Staff), and at least one occurrence are required." },
      { status: 400 }
    );
  }

  const db = readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const studentEligible = isStudentEligible(group);
  if (studentEligible) {
    delete service.Code;
  } else if (code && code.trim()) {
    const finalCode = code.trim().toUpperCase();
    if (db.services.some((s) => s.Code === finalCode && s.ServiceID !== serviceId)) {
      return NextResponse.json({ error: `Code "${finalCode}" is already in use.` }, { status: 400 });
    }
    service.Code = finalCode;
  } else if (!service.Code) {
    service.Code = autoServiceCode(name, db, serviceId);
  }

  service.Name = name;
  service.Type = type;
  service.Group = group;
  service.MonthlyCost = Number(monthlyCost) || 0;
  applyStudentOnlyFields(service, body, group);
  service.OccuranceList = occurrences.map((o) => ({
    OccuranceID: o.occuranceId || nextId(db, "OCC"),
    Day: o.day,
    Time: o.time,
    Duration: Number(o.duration),
    Facilitator: o.facilitator,
  }));

  ensureScheduleGenerated(db);
  writeDB(db);

  return NextResponse.json({ service });
}

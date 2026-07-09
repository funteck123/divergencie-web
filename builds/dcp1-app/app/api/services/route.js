import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

export async function GET() {
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);
  return NextResponse.json({ services: db.services });
}

// A Service's Group is an array of the account types it's open to — gates
// who can book/enroll it (Trial accounts only see ones including Student,
// Interview accounts only ones including Staff).
export const ALL_GROUPS = ["Student", "Teacher", "Staff", "Management", "Parent", "Ambassador"];

function isValidGroup(group) {
  return Array.isArray(group) && group.length > 0 && group.every((g) => ALL_GROUPS.includes(g));
}

// Fields that only apply to services open to Student or Teacher (the two
// "attends a cohort" account types). Rate+Currency replace MonthlyCost/
// Compensation as the billing amount for these — every other group keeps
// MonthlyCost/Compensation unchanged.
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
    service.Currency = body.currency || "INR";
    service.Rate = Number(body.rate) || 0;
  } else {
    for (const key of ["Batch", "Board", "CourseClass", "SubjectCode", "SubjectName", "FullSubjectName", "Currency", "Rate"]) {
      delete service[key];
    }
  }
}

// body: { name, type, group: string[] (subset of ALL_GROUPS), monthlyCost,
//         batch?, board?, courseClass?, subjectCode?, subjectName?, fullSubjectName?, currency?, rate?
//         (all Student/Teacher-only), occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. A service can belong to several groups at once. Cohort-only fields
// are silently dropped if sent for a service not open to Student/Teacher.
export async function POST(req) {
  const body = await req.json();
  const { name, type, group, monthlyCost, occurrences } = body;

  if (!name || !type || !isValidGroup(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: `name, type, group (non-empty subset of ${ALL_GROUPS.join(", ")}), and at least one occurrence are required.` },
      { status: 400 }
    );
  }

  const db = readDB();

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
  applyCohortServiceFields(service, body, group);
  db.services.push(service);
  ensureScheduleGenerated(db);
  writeDB(db);

  return NextResponse.json({ service });
}

// body: { serviceId, name, type, group, monthlyCost,
//         occurrences: [{occuranceId?, day, time, duration, facilitator}], + the Student-only fields listed above }
// Occurrences are replaced wholesale: existing ones keep their OccuranceID
// (so already-generated ScheduleItems still trace back to them), new ones
// get a fresh ID. Already-generated ScheduleItems are historical and are
// never rewritten — edits only change what ensureScheduleGenerated produces
// going forward. Student-only fields are dropped if the Service is edited
// to a Staff-only Group.
export async function PATCH(req) {
  const body = await req.json();
  const { serviceId, name, type, group, monthlyCost, occurrences } = body;

  if (!serviceId || !name || !type || !isValidGroup(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: `serviceId, name, type, group (non-empty subset of ${ALL_GROUPS.join(", ")}), and at least one occurrence are required.` },
      { status: 400 }
    );
  }

  const db = readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  service.Name = name;
  service.Type = type;
  service.Group = group;
  service.MonthlyCost = Number(monthlyCost) || 0;
  delete service.Code;
  applyCohortServiceFields(service, body, group);
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

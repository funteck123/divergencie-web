import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

export async function GET() {
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);
  return NextResponse.json({ services: db.services });
}

// body: { name, type, group: "Student" | "Staff" | "Both", monthlyCost, occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. "Both" makes a Service bookable by either.
export async function POST(req) {
  const body = await req.json();
  const { name, type, group, monthlyCost, occurrences } = body;

  if (!name || !type || !["Student", "Staff", "Both"].includes(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: "name, type, group (Student/Staff), and at least one occurrence are required." },
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
  db.services.push(service);
  ensureScheduleGenerated(db);
  writeDB(db);

  return NextResponse.json({ service });
}

// body: { serviceId, name, type, group, monthlyCost, occurrences: [{occuranceId?, day, time, duration, facilitator}] }
// Occurrences are replaced wholesale: existing ones keep their OccuranceID
// (so already-generated ScheduleItems still trace back to them), new ones
// get a fresh ID. Already-generated ScheduleItems are historical and are
// never rewritten — edits only change what ensureScheduleGenerated produces
// going forward.
export async function PATCH(req) {
  const body = await req.json();
  const { serviceId, name, type, group, monthlyCost, occurrences } = body;

  if (!serviceId || !name || !type || !["Student", "Staff", "Both"].includes(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
    return NextResponse.json(
      { error: "serviceId, name, type, group (Student/Staff), and at least one occurrence are required." },
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

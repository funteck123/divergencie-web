import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

export async function GET() {
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);
  return NextResponse.json({ services: db.services });
}

// body: { name, type, group: "Student" | "Staff", monthlyCost, occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book Student-group services, Interview accounts only Staff-group ones.
export async function POST(req) {
  const body = await req.json();
  const { name, type, group, monthlyCost, occurrences } = body;

  if (!name || !type || !["Student", "Staff"].includes(group) || !Array.isArray(occurrences) || occurrences.length === 0) {
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

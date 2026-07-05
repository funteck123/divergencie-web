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

// body: { name, type, group: "Student" | "Staff" | "Both", monthlyCost, code?, occurrences: [{day, time, duration, facilitator}] }
// Group determines which pool a Service's slots fall into: Trial accounts can
// only book services open to Student, Interview accounts only ones open to
// Staff. "Both" makes a Service bookable by either. Code is auto-generated
// from the name unless one is given manually (must be unique either way).
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

  let finalCode;
  if (code && code.trim()) {
    finalCode = code.trim().toUpperCase();
    if (db.services.some((s) => s.Code === finalCode)) {
      return NextResponse.json({ error: `Code "${finalCode}" is already in use.` }, { status: 400 });
    }
  } else {
    finalCode = autoServiceCode(name, db);
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
    Code: finalCode,
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

// body: { serviceId, name, type, group, monthlyCost, code?, occurrences: [{occuranceId?, day, time, duration, facilitator}] }
// Occurrences are replaced wholesale: existing ones keep their OccuranceID
// (so already-generated ScheduleItems still trace back to them), new ones
// get a fresh ID. Already-generated ScheduleItems are historical and are
// never rewritten — edits only change what ensureScheduleGenerated produces
// going forward. Code keeps its previous value if not supplied.
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

  if (code && code.trim()) {
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

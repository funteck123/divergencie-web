import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

export async function GET() {
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);
  return NextResponse.json({ scheduleItems: db.scheduleItems });
}

// Management creates an open-pool slot for a Trial or Interview session.
// Every Trial/Interview is for a specific Service (e.g. "trying out" a real
// class, or interviewing for a role tied to a real service) — so serviceId
// is required, not optional.
// body: { serviceType: "Trial" | "Interview", serviceId, date, time, duration, facilitator }
export async function POST(req) {
  const body = await req.json();
  const { serviceType, serviceId, date, time, duration, facilitator } = body;

  if (!["Trial", "Interview"].includes(serviceType) || !serviceId || !date || !time) {
    return NextResponse.json(
      { error: "serviceType (Trial/Interview), serviceId, date, and time are required." },
      { status: 400 }
    );
  }

  const db = readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const item = {
    ScheduleID: nextId(db, "SCH"),
    ServiceID: service.ServiceID,
    ServiceName: service.Name,
    ServiceType: serviceType, // "Trial" | "Interview" — distinguishes pool slots from real occurrences
    OccuranceID: null,
    Date: date,
    Time: time,
    Duration: Number(duration) || 1,
    Facilitator: facilitator || "",
  };
  db.scheduleItems.push(item);
  writeDB(db);

  return NextResponse.json({ scheduleItem: item });
}

import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, requiredGroupForBookingType, groupMatches, normalizeGroup, sortByDateTime, BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireSession, requireManagement } from "@/lib/authz";

export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  ensureScheduleGenerated(db);
  await writeDB(db);
  // Every unbooked slot is open pool — manually-offered Trial/Interview slots
  // and auto-generated Service occurrences alike.
  const openPoolSlots = sortByDateTime(db.scheduleItems.filter((s) => !isSlotBooked(db, s.ScheduleID)));
  return NextResponse.json({ scheduleItems: sortByDateTime(db.scheduleItems), openPoolSlots });
}

// Management creates an open-pool slot for a Trial or one of the three
// Interview tracks. Every slot is for a specific Service (e.g. "trying out"
// a real class, or interviewing for a role tied to a real service) — so
// serviceId is required, not optional.
// body: { serviceType: "Trial"|"TeacherInterview"|"StaffInterview"|"AmbassadorInterview", serviceId, date, time, duration, facilitator }
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { serviceType, serviceId, date, time, duration, facilitator } = body;

  if (!BOOKING_TYPES.includes(serviceType) || !serviceId || !date || !time) {
    return NextResponse.json(
      { error: `serviceType (${BOOKING_TYPES.join("/")}), serviceId, date, and time are required.` },
      { status: 400 }
    );
  }

  const db = await readDB();
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const requiredGroup = requiredGroupForBookingType(serviceType);
  if (!groupMatches(service.Group, requiredGroup)) {
    return NextResponse.json(
      { error: `${serviceType} slots require a ${requiredGroup}-open Service.` },
      { status: 400 }
    );
  }

  const item = {
    ScheduleID: nextId(db, "SCH"),
    ServiceID: service.ServiceID,
    ServiceName: service.Name,
    ServiceType: serviceType, // distinguishes pool slots (Trial/*Interview) from real occurrences
    ServiceGroup: normalizeGroup(service.Group),
    OccuranceID: null,
    Date: date,
    Time: time,
    Duration: Number(duration) || 1,
    Facilitator: facilitator || "",
  };
  db.scheduleItems.push(item);
  await writeDB(db);

  return NextResponse.json({ scheduleItem: item });
}

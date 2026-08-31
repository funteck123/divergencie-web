import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, requiredGroupForBookingType, groupMatches, normalizeGroup, sortByDateTime, BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireSession, requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  if ((await ensureScheduleGenerated(db)) > 0) await writeDB(db, ["scheduleItems"]);
  // Every unbooked slot is open pool — manually-offered Trial/Interview slots
  // and auto-generated Service occurrences alike. Sending back the IDs only,
  // not full duplicate objects, cuts the response roughly in half: on real
  // data this route's open pool is most of scheduleItems (504 of 509 items
  // in one live measurement), so a full second copy of nearly every item
  // was ~150KB of pure duplication on every call. The one caller that
  // renders open-pool slots already has the full objects in `scheduleItems`
  // and reconstitutes them locally via these IDs.
  const openPoolSlotIds = sortByDateTime(db.scheduleItems.filter((s) => !isSlotBooked(db, s.ScheduleID))).map((s) => s.ScheduleID);
  return NextResponse.json({ scheduleItems: sortByDateTime(db.scheduleItems), openPoolSlotIds });
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

  // `Number(duration) || 1` only guarded against 0/NaN, not negatives --
  // a red-team pass showed a negative duration would have been stored
  // as-is and fed straight into downstream billing-hours math.
  if (duration !== undefined) {
    const n = Number(duration);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "duration must be a positive number." }, { status: 400 });
    }
  }

  const item = {
    ScheduleID: await nextId(db, "SCH"),
    ServiceID: service.ServiceID,
    ServiceName: service.Name,
    ServiceType: serviceType, // distinguishes pool slots (Trial/*Interview) from real occurrences
    ServiceGroup: normalizeGroup(service.Group),
    OccuranceID: null,
    Date: date,
    Time: time,
    // TKT-0079: manually-offered Trial/Interview slots previously carried no
    // Timezone at all (unlike regular occurrences), so a candidate seeing
    // "16:00" had no way to know what timezone that was in. Standardized on
    // IST -- Management offers every Trial/Interview slot from India.
    Timezone: "Asia/Kolkata",
    Duration: Number(duration) || 1,
    Facilitator: facilitator || "",
  };
  db.scheduleItems.push(item);
  await writeDB(db, ["scheduleItems"]);

  return NextResponse.json({ scheduleItem: item });
}

// Management's direct reschedule — applies immediately, no approval step
// (unlike a self-service suggestion, see app/api/schedule/reschedule-requests/
// route.js, which requires Management to approve before this same effect
// happens). Original Date/Time are never touched — RescheduledDate/Time are
// a separate pair of fields so the original slot stays the historical
// record (attendance, invoices, etc. all still key off the original).
// body: { scheduleId, rescheduledDate, rescheduledTime, duration? } — either
// reschedule field passed as "" clears an existing reschedule. `duration`
// is a real gap this route had no way to correct before: hours, same field
// the create path (POST above) validates, added specifically because a
// mistyped Duration (e.g. "30" meant as minutes, not hours) had no fix path
// at all short of deleting and recreating the whole schedule item.
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { scheduleId, rescheduledDate, rescheduledTime, duration } = await req.json();
  if (!scheduleId) return NextResponse.json({ error: "scheduleId is required." }, { status: 400 });

  if (duration !== undefined) {
    const n = Number(duration);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "duration must be a positive number." }, { status: 400 });
    }
  }

  const db = await readDB();
  const item = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
  if (!item) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  if (rescheduledDate !== undefined) item.RescheduledDate = rescheduledDate;
  if (rescheduledTime !== undefined) item.RescheduledTime = rescheduledTime;
  if (duration !== undefined) item.Duration = Number(duration);
  await writeDB(db, ["scheduleItems"]);

  return NextResponse.json({ scheduleItem: item });
}

// TKT-0048: no delete path existed for a single ScheduleItem before this,
// only GET/POST/PATCH. Added for cleaning up legacy/orphan slots (no
// BatchID, generated before per-Batch schedules existed) — same
// leaf-record deletion pattern as every other single-item DELETE in this
// app (invoices, paychecks, apikeys): Management-only, no extra guard,
// since deleting one calendar slot is low blast radius compared to
// deleting a whole Service or Enrollment.
// body: { scheduleId }
export async function DELETE(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { scheduleId } = await req.json();
  if (!scheduleId) return NextResponse.json({ error: "scheduleId is required." }, { status: 400 });

  const db = await readDB();
  const index = db.scheduleItems.findIndex((s) => s.ScheduleID === scheduleId);
  if (index === -1) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  const [deleted] = db.scheduleItems.splice(index, 1);
  await deleteRecords(db, [{ collection: "scheduleItems", ids: [scheduleId] }]);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "ScheduleItem", entityId: scheduleId, summary: `Deleted schedule item ${scheduleId}`, snapshot: deleted });

  return NextResponse.json({ ok: true });
}

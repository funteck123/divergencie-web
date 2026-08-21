import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawSchedule } from "@/lib/scheduleImage";
import { normalizeTimezone, convertWeeklyTime } from "@/lib/timezones";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { batchesOf } from "@/lib/billing";

// TKT-0041: the header's "Batch:" field used to read a free-text user.Batch
// profile field Management had to type by hand — completely disconnected
// from the teacher's actual enrollment data, so it silently stayed blank
// for any teacher enrolled without someone also manually duplicating the
// batch name onto their account. Deriving it straight from the same
// enrollments/BatchID the schedule grid itself uses makes it self-updating
// and removes that manual step entirely. A Staff-role Service has no
// Batches (see buildEntries below), so this only ever finds something for
// Teacher enrollments — Staff still fall back to entity.className===Department.
function teacherBatchLabel(db, userId) {
  const names = [];
  for (const e of db.enrollments.filter((e) => e.UserID === userId)) {
    const service = db.services.find((s) => s.ServiceID === e.ServiceID);
    const batches = batchesOf(service);
    if (!batches.length) continue;
    const batch = e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0];
    if (batch?.BatchName && !names.includes(batch.BatchName)) names.push(batch.BatchName);
  }
  return names.join(", ");
}

// Only the specific Batch each enrollment points to — a Service can now have
// several Batches, and an enrollment only grants a seat in one of them.
//
// Each occurrence carries its own Timezone (set when the Batch schedule was
// created — see EMPTY_OCC in the management dashboard); that's not
// necessarily the SAME timezone as the viewer's own profile Timezone
// (entity.timezone, shown in the image header). Day/Time here are
// converted into the viewer's timezone (TKT-0008) so what's printed on the
// grid actually matches the label in the header — previously the raw
// stored Day/Time was shown as-is, mislabeled under the viewer's own
// timezone even when the occurrence was set in a different one.
function buildEntries(db, userId, viewerTimezone) {
  const myEnrollments = db.enrollments.filter((e) => e.UserID === userId);
  const entries = [];
  for (const e of myEnrollments) {
    const service = db.services.find((s) => s.ServiceID === e.ServiceID);
    if (!service) continue;
    const batches = batchesOf(service);
    // A Staff-role Service (Role/Department, no Batches) keeps its
    // OccuranceList directly on the Service.
    const occurrences = batches.length > 0
      ? (e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0])?.OccuranceList
      : service.OccuranceList;
    for (const o of occurrences || []) {
      // An occurrence with no Day/Time set yet (e.g. a resource-only
      // service pending a real schedule) has nothing to draw — skip it.
      if (!o.Day || !o.Time) continue;
      const { day, time } = convertWeeklyTime(o.Day, o.Time, normalizeTimezone(o.Timezone), viewerTimezone);
      entries.push({ name: service.Name, day, time });
    }
  }
  return entries;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const download = searchParams.get("download") === "1";

  const db = await readDB();
  const { error } = requireSelfOrParentOrManagement(req, db, userId);
  if (error) return error;

  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!["Student", "Teacher", "Staff"].includes(user.UserType)) {
    return NextResponse.json({ error: "Schedule image only available for Student/Teacher/Staff." }, { status: 400 });
  }

  let role = "student";
  if (user.UserType === "Teacher") role = "teacherRole";
  if (user.UserType === "Staff") role = "staff";
  const viewerTimezone = normalizeTimezone(user.Timezone);
  const entity = {
    name: user.Name,
    role,
    timezone: viewerTimezone,
    // TKT-0008: this slot was blank for Student (dcp1-app students can be
    // enrolled across multiple unrelated Services, unlike p26's
    // one-class-per-student model, so there's no single ENROLLMENT to name
    // here) — now shows the student's own profile Course field instead
    // (e.g. "IGCSE"), the same general-course label Management already
    // sets on the account. Teacher/Staff keep showing their Batch/
    // Department in the same template slot, unchanged.
    className: user.UserType === "Teacher" ? teacherBatchLabel(db, userId) || user.Batch || "" : user.UserType === "Staff" ? user.Department || "" : user.Course || "",
  };
  const entries = buildEntries(db, userId, viewerTimezone);

  const buffer = await drawSchedule(entity, entries);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="DC_Schedule_${user.Name}.png"`,
      "Cache-Control": "no-store",
    },
  });
}

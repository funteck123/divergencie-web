import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawSchedule } from "@/lib/scheduleImage";
import { normalizeTimezone, convertWeeklyTime } from "@/lib/timezones";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { batchesOf } from "@/lib/billing";

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
  // TKT-0106: the template's "Batch:" label is baked into the base PNG for
  // Teacher, so leaving the value blank (TKT-0041's original call, since a
  // teacher can be enrolled across several batches at once and any single
  // one would misrepresent the rest) left a visibly empty field on every
  // Teacher's schedule image. "Multiple" is honest without picking a
  // misleading single winner.
  function teacherBatchLabel() {
    const names = new Set();
    for (const e of db.enrollments.filter((en) => en.UserID === userId)) {
      const service = db.services.find((s) => s.ServiceID === e.ServiceID);
      const batch = service ? batchesOf(service).find((b) => b.BatchID === e.BatchID) : null;
      if (batch?.BatchName) names.add(batch.BatchName);
    }
    if (names.size === 0) return "None";
    if (names.size === 1) return [...names][0];
    return "Multiple";
  }
  const entity = {
    name: user.Name,
    role,
    timezone: viewerTimezone,
    // TKT-0008: this slot was blank for Student (dcp1-app students can be
    // enrolled across multiple unrelated Services, unlike p26's
    // one-class-per-student model, so there's no single ENROLLMENT to name
    // here). It now shows the student's own profile Course field instead
    // (e.g. "IGCSE"), the same general-course label Management already
    // sets on the account. Staff keep showing their Department in the same
    // template slot. Teacher shows its enrolled batch name(s), or
    // "Multiple" (see teacherBatchLabel above).
    className: user.UserType === "Staff" ? user.Department || "" : user.UserType === "Student" ? user.Course || "" : teacherBatchLabel(),
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

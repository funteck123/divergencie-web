import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, groupMatches, sortByDateTime, requiredGroupForBookingType } from "@/lib/scheduleGen";
import { requireSelfOrManagement } from "@/lib/authz";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const { error } = requireSelfOrManagement(req, userId);
  if (error) return error;

  const db = await readDB();
  ensureScheduleGenerated(db);
  await writeDB(db);

  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const enrollments = db.enrollments.filter((e) => e.UserID === userId);
  const enrolledServiceIds = new Set(enrollments.map((e) => e.ServiceID));
  const scheduleItems = sortByDateTime(db.scheduleItems.filter((s) => enrolledServiceIds.has(s.ServiceID)));
  const attendanceItems = db.attendanceItems.filter((a) => a.UserID === userId);

  const trialItems = db.trialItems.filter((t) => t.TrialAccID === userId);
  const interviewItems = db.interviewItems.filter((i) => i.InterviewAccID === userId);

  // Draft invoices/paychecks are an internal Management staging state (before
  // INR pricing is set and it's marked Sent) — not visible to the account.
  const invoices = db.invoices.filter((i) => i.StudentID === userId && i.Status !== "Draft");
  const paychecks = db.paychecks.filter((p) => p.StaffID === userId && p.Status !== "Draft");

  // Open pool slots this user (Trial/Interview) hasn't requested or booked yet.
  // Includes manually-offered Trial/Interview slots AND every auto-generated
  // Service occurrence (OccuranceID set) — any real class session doubles as
  // an open pool slot. Gated by ServiceGroup: Trial only sees services open
  // to Student; each Interview track (Teacher/Staff/Ambassador) only sees
  // services open to its own matching Group — derived from this account's
  // own UserType ("TeacherInterviewAcc" -> requiredGroupForBookingType("TeacherInterview") -> "Teacher").
  // Multiple accounts may hold a Pending request on the same slot;
  // Management approves one.
  const myRequestedTrialSlotIds = new Set(
    trialItems.filter((t) => t.Status !== "Rejected").map((t) => t.ScheduleItemID)
  );
  const myRequestedInterviewSlotIds = new Set(
    interviewItems.filter((i) => i.Status !== "Rejected").map((i) => i.ScheduleItemID)
  );
  const availableTrialSlots = sortByDateTime(
    db.scheduleItems.filter(
      (s) =>
        !isSlotBooked(db, s.ScheduleID) &&
        !myRequestedTrialSlotIds.has(s.ScheduleID) &&
        groupMatches(s.ServiceGroup, "Student")
    )
  );
  const interviewRequiredGroup = requiredGroupForBookingType(user.UserType.replace(/Acc$/, ""));
  const availableInterviewSlots = sortByDateTime(
    db.scheduleItems.filter(
      (s) =>
        !isSlotBooked(db, s.ScheduleID) &&
        !myRequestedInterviewSlotIds.has(s.ScheduleID) &&
        groupMatches(s.ServiceGroup, interviewRequiredGroup)
    )
  );

  let children = [];
  if (user.UserType === "Parent" && Array.isArray(user.StudentIDs)) {
    children = user.StudentIDs.map((sid) => {
      const child = db.users.find((u) => u.UserID === sid);
      const childEnroll = db.enrollments.filter((e) => e.UserID === sid);
      const childServiceIds = new Set(childEnroll.map((e) => e.ServiceID));
      return {
        student: child,
        enrollments: childEnroll,
        schedule: sortByDateTime(db.scheduleItems.filter((s) => childServiceIds.has(s.ServiceID))),
        attendance: db.attendanceItems.filter((a) => a.UserID === sid),
        invoices: db.invoices.filter((i) => i.StudentID === sid && i.Status !== "Draft"),
      };
    });
  }

  return NextResponse.json({
    user,
    enrollments,
    scheduleItems,
    attendanceItems,
    trialItems,
    interviewItems,
    invoices,
    paychecks,
    availableTrialSlots,
    availableInterviewSlots,
    children,
    services: db.services,
  });
}

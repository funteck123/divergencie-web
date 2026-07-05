import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, groupMatches } from "@/lib/scheduleGen";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const db = readDB();
  ensureScheduleGenerated(db);
  writeDB(db);

  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const enrollments = db.enrollments.filter((e) => e.UserID === userId);
  const enrolledServiceIds = new Set(enrollments.map((e) => e.ServiceID));
  const scheduleItems = db.scheduleItems.filter((s) => enrolledServiceIds.has(s.ServiceID));
  const attendanceItems = db.attendanceItems.filter((a) => a.UserID === userId);

  const trialItems = db.trialItems.filter((t) => t.TrialAccID === userId);
  const interviewItems = db.interviewItems.filter((i) => i.InterviewAccID === userId);

  // Draft invoices are an internal Management staging state (before INR
  // pricing is set and the invoice is marked Sent) — not visible to the account.
  const invoices = db.invoices.filter((i) => i.StudentID === userId && i.Status !== "Draft");
  const paychecks = db.paychecks.filter((p) => p.StaffID === userId);

  // Open pool slots this user (Trial/Interview) hasn't requested or booked yet.
  // Includes manually-offered Trial/Interview slots AND every auto-generated
  // Service occurrence (OccuranceID set) — any real class session doubles as
  // an open pool slot. Gated by ServiceGroup: Trial only sees services open
  // to Student, Interview only ones open to Staff ("Both" satisfies either).
  // Multiple accounts may hold a Pending request on the same slot;
  // Management approves one.
  const myRequestedTrialSlotIds = new Set(
    trialItems.filter((t) => t.Status !== "Rejected").map((t) => t.ScheduleItemID)
  );
  const myRequestedInterviewSlotIds = new Set(
    interviewItems.filter((i) => i.Status !== "Rejected").map((i) => i.ScheduleItemID)
  );
  const availableTrialSlots = db.scheduleItems.filter(
    (s) =>
      !isSlotBooked(db, s.ScheduleID) &&
      !myRequestedTrialSlotIds.has(s.ScheduleID) &&
      groupMatches(s.ServiceGroup, "Student")
  );
  const availableInterviewSlots = db.scheduleItems.filter(
    (s) =>
      !isSlotBooked(db, s.ScheduleID) &&
      !myRequestedInterviewSlotIds.has(s.ScheduleID) &&
      groupMatches(s.ServiceGroup, "Staff")
  );

  let children = [];
  if (user.UserType === "Parent" && Array.isArray(user.StudentIDs)) {
    children = user.StudentIDs.map((sid) => {
      const child = db.users.find((u) => u.UserID === sid);
      const childEnroll = db.enrollments.filter((e) => e.UserID === sid);
      const childServiceIds = new Set(childEnroll.map((e) => e.ServiceID));
      return {
        student: child,
        schedule: db.scheduleItems.filter((s) => childServiceIds.has(s.ServiceID)),
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

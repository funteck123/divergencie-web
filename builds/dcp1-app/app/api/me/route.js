import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { ensureScheduleGenerated } from "@/lib/scheduleGen";

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

  const invoices = db.invoices.filter((i) => i.StudentID === userId);
  const paychecks = db.paychecks.filter((p) => p.StaffID === userId);

  // Open pool slots this user (Trial/Interview) hasn't booked yet
  const availableTrialSlots = db.scheduleItems.filter(
    (s) => s.ServiceType === "Trial" && !db.trialItems.some((t) => t.ScheduleItemID === s.ScheduleID)
  );
  const availableInterviewSlots = db.scheduleItems.filter(
    (s) => s.ServiceType === "Interview" && !db.interviewItems.some((t) => t.ScheduleItemID === s.ScheduleID)
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
        invoices: db.invoices.filter((i) => i.StudentID === sid),
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

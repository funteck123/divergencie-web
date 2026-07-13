import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, groupMatches, sortByDateTime, requiredGroupForBookingType } from "@/lib/scheduleGen";
import { requireSelfOrManagement } from "@/lib/authz";
import { convertRecordTotal } from "@/lib/fxRates";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const { error } = requireSelfOrManagement(req, userId);
  if (error) return error;

  const db = await readDB();
  if (ensureScheduleGenerated(db) > 0) await writeDB(db);

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
  const rawInvoices = db.invoices.filter((i) => i.StudentID === userId && i.Status !== "Draft");
  const rawPaychecks = db.paychecks.filter((p) => p.StaffID === userId && p.Status !== "Draft");

  // ConvertedTotal is the record's total in the viewer's OWN profile
  // Currency (may differ from both the record's own Currency and from
  // INR) — pivots through the record's already-frozen INRAmount, see
  // lib/fxRates.js. Tracked so we only persist the FX cache (db.fxRates)
  // back to the DB when a lookup actually added a new entry.
  const fxRatesBefore = Object.keys(db.fxRates || {}).length;
  const invoices = await Promise.all(
    rawInvoices.map(async (i) => ({ ...i, ConvertedTotal: await convertRecordTotal(db, i, user.Currency || "INR") }))
  );
  const paychecks = await Promise.all(
    rawPaychecks.map(async (p) => ({ ...p, ConvertedTotal: await convertRecordTotal(db, p, user.Currency || "INR") }))
  );

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
  // Use the Service's current Group, not the ScheduleItem's own baked-in
  // ServiceGroup snapshot — a Service's Group can be edited after its
  // schedule items already exist (e.g. adding "Teacher" to a Student-only
  // service later), and those older items are otherwise never rewritten
  // (intentionally, for occurrence/attendance history), so their stale
  // snapshot would silently keep matching the group it had at generation
  // time forever, hiding real availability from newly-eligible accounts.
  function currentGroupOf(scheduleItem) {
    return db.services.find((svc) => svc.ServiceID === scheduleItem.ServiceID)?.Group ?? scheduleItem.ServiceGroup;
  }

  const availableTrialSlots = sortByDateTime(
    db.scheduleItems.filter(
      (s) =>
        !isSlotBooked(db, s.ScheduleID) &&
        !myRequestedTrialSlotIds.has(s.ScheduleID) &&
        groupMatches(currentGroupOf(s), "Student")
    )
  );
  const interviewRequiredGroup = requiredGroupForBookingType(user.UserType.replace(/Acc$/, ""));
  const availableInterviewSlots = sortByDateTime(
    db.scheduleItems.filter(
      (s) =>
        !isSlotBooked(db, s.ScheduleID) &&
        !myRequestedInterviewSlotIds.has(s.ScheduleID) &&
        groupMatches(currentGroupOf(s), interviewRequiredGroup)
    )
  );

  let children = [];
  if (user.UserType === "Parent" && Array.isArray(user.StudentIDs)) {
    children = await Promise.all(
      user.StudentIDs.map(async (sid) => {
        const child = db.users.find((u) => u.UserID === sid);
        const childEnroll = db.enrollments.filter((e) => e.UserID === sid);
        const childServiceIds = new Set(childEnroll.map((e) => e.ServiceID));
        const childInvoices = db.invoices.filter((i) => i.StudentID === sid && i.Status !== "Draft");
        const childInvoicesWithTotals = await Promise.all(
          childInvoices.map(async (i) => ({ ...i, ConvertedTotal: await convertRecordTotal(db, i, child?.Currency || "INR") }))
        );
        return {
          student: child,
          enrollments: childEnroll,
          schedule: sortByDateTime(db.scheduleItems.filter((s) => childServiceIds.has(s.ServiceID))),
          attendance: db.attendanceItems.filter((a) => a.UserID === sid),
          invoices: childInvoicesWithTotals,
        };
      })
    );
  }

  if (Object.keys(db.fxRates || {}).length !== fxRatesBefore) {
    await writeDB(db);
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

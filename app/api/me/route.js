import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { ensureScheduleGenerated, isSlotBooked, groupMatches, sortByDateTime } from "@/lib/scheduleGen";
import { requireSelfOrManagement } from "@/lib/authz";
import { convertINRAmount } from "@/lib/fxRates";

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
  // Schedule only reflects still-active enrollments (no EndDate, or EndDate
  // hasn't passed yet) — an ended enrollment's Service shouldn't keep
  // showing up in the calendar/list views. `enrollments` itself (returned
  // below) stays unfiltered — the Enrollments table is a historical record
  // and should keep showing ended ones.
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeEnrollments = enrollments.filter((e) => !e.EndDate || e.EndDate >= todayStr);
  // Keyed by ServiceID+BatchID, not ServiceID alone — a Service can have
  // several Batches now, and an enrollment only grants visibility into the
  // one Batch it's actually in. ScheduleItems without a BatchID (open-pool
  // Trial/Interview slots, not batch-derived) still match on ServiceID alone.
  const enrolledServiceIds = new Set(activeEnrollments.map((e) => e.ServiceID));
  const enrolledBatchKeys = new Set(activeEnrollments.map((e) => `${e.ServiceID}::${e.BatchID || ""}`));
  const scheduleItems = sortByDateTime(
    db.scheduleItems.filter((s) =>
      s.BatchID ? enrolledBatchKeys.has(`${s.ServiceID}::${s.BatchID}`) : enrolledServiceIds.has(s.ServiceID)
    )
  );
  const attendanceItems = db.attendanceItems.filter((a) => a.UserID === userId);

  const trialItems = db.trialItems.filter((t) => t.TrialAccID === userId);
  const interviewItems = db.interviewItems.filter((i) => i.InterviewAccID === userId);

  // Draft invoices/paychecks are an internal Management staging state (before
  // INR pricing is set and it's marked Sent) — not visible to the account.
  const rawInvoices = db.invoices.filter((i) => i.StudentID === userId && i.Status !== "Draft");
  const rawPaychecks = db.paychecks.filter((p) => p.StaffID === userId && p.Status !== "Draft");

  // ConvertedDue is the outstanding INR Due converted into the viewer's OWN
  // profile Currency (may differ from the record's own billed Currency) —
  // pairs with Amount Due (same balance, shown in the record's own
  // currency instead). See lib/fxRates.js. Tracked so we only persist the
  // FX cache (db.fxRates) back to the DB when a lookup actually added a
  // new entry.
  const fxRatesBefore = Object.keys(db.fxRates || {}).length;
  const invoices = await Promise.all(
    rawInvoices.map(async (i) => ({ ...i, ConvertedDue: await convertINRAmount(db, i.INRDue, user.Currency || "INR", i.Year, i.Month) }))
  );
  const paychecks = await Promise.all(
    rawPaychecks.map(async (p) => ({ ...p, ConvertedDue: await convertINRAmount(db, p.INRDue, user.Currency || "INR", p.Year, p.Month) }))
  );

  // Open pool slots this user (Trial only — Interview accounts no longer
  // pick their own slot, see TKT-0021: they request an interview and
  // Management assigns the actual slot on approval) hasn't requested or
  // booked yet. Includes manually-offered Trial slots AND every
  // auto-generated Service occurrence (OccuranceID set) — any real class
  // session doubles as an open pool slot. Gated by ServiceGroup: Trial
  // only sees services open to Student. Multiple accounts may hold a
  // Pending request on the same slot; Management approves one.
  const myRequestedTrialSlotIds = new Set(
    trialItems.filter((t) => t.Status !== "Rejected").map((t) => t.ScheduleItemID)
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

  let children = [];
  if (user.UserType === "Parent" && Array.isArray(user.StudentIDs)) {
    children = await Promise.all(
      user.StudentIDs.map(async (sid) => {
        const child = db.users.find((u) => u.UserID === sid);
        const childEnroll = db.enrollments.filter((e) => e.UserID === sid);
        const childActiveEnroll = childEnroll.filter((e) => !e.EndDate || e.EndDate >= todayStr);
        const childServiceIds = new Set(childActiveEnroll.map((e) => e.ServiceID));
        const childBatchKeys = new Set(childActiveEnroll.map((e) => `${e.ServiceID}::${e.BatchID || ""}`));
        const childInvoices = db.invoices.filter((i) => i.StudentID === sid && i.Status !== "Draft");
        const childInvoicesWithTotals = await Promise.all(
          childInvoices.map(async (i) => ({ ...i, ConvertedDue: await convertINRAmount(db, i.INRDue, child?.Currency || "INR", i.Year, i.Month) }))
        );
        const childSchedule = sortByDateTime(
          db.scheduleItems.filter((s) =>
            s.BatchID ? childBatchKeys.has(`${s.ServiceID}::${s.BatchID}`) : childServiceIds.has(s.ServiceID)
          )
        );
        return {
          student: child,
          enrollments: childEnroll,
          schedule: childSchedule,
          attendance: db.attendanceItems.filter((a) => a.UserID === sid),
          invoices: childInvoicesWithTotals,
          rescheduleRequests: (db.rescheduleRequests || []).filter(
            (r) => r.Status === "Pending" && childSchedule.some((s) => s.ScheduleID === r.ScheduleItemID)
          ),
        };
      })
    );
  }

  if (Object.keys(db.fxRates || {}).length !== fxRatesBefore) {
    await writeDB(db);
  }

  // Notes is a private Management admin field (see the Student Accounts
  // table in the Management dashboard) — never surface it to the account's
  // own self-view or to a Parent viewing their child's record.
  const { Notes: _userNotes, ...userSafe } = user;
  const childrenSafe = children?.map(({ student, ...rest }) => {
    if (!student) return { student, ...rest };
    const { Notes: _childNotes, ...studentSafe } = student;
    return { student: studentSafe, ...rest };
  });

  return NextResponse.json({
    user: userSafe,
    enrollments,
    scheduleItems,
    attendanceItems,
    trialItems,
    interviewItems,
    invoices,
    paychecks,
    availableTrialSlots,
    children: childrenSafe,
    services: db.services,
    guides: (db.guides || []).filter((g) => (g.UserTypes || []).includes(user.UserType)),
    // Only Pending — once approved the slot's own RescheduledDate/Time
    // already shows it (see ScheduleItem), and a rejected request has
    // nothing left for the requester to act on.
    rescheduleRequests: (db.rescheduleRequests || []).filter(
      (r) => r.Status === "Pending" && scheduleItems.some((s) => s.ScheduleID === r.ScheduleItemID)
    ),
  });
}

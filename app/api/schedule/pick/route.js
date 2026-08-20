import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { serviceGroupOf, requiredGroupForBookingType, groupMatches, BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireSelfOrManagement } from "@/lib/authz";

// body:
//   Trial:    { userId, type: "Trial", scheduleId } — self-service, picks a
//             specific open-pool slot directly, same as always.
//   Interview: { userId, type: "TeacherInterview"|"StaffInterview"|
//             "AmbassadorInterview", serviceId } — TKT-0021: no slot picker
//             for Interview accounts anymore. This only records the request
//             against a Service; Management assigns the actual slot (an
//             existing open one, or a newly created one via POST
//             /api/schedule) when approving it via PATCH
//             /api/schedule/requests.
// Multiple accounts may request the same slot/service ("double booking") —
// Management approves one via PATCH /api/schedule/requests, which is what
// actually locks a slot (see isSlotBooked). This route only records a
// Pending request.
export async function POST(req) {
  const { scheduleId, serviceId, userId, type } = await req.json();
  const { error } = requireSelfOrManagement(req, userId);
  if (error) return error;

  if (!BOOKING_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${BOOKING_TYPES.join("/")}.` }, { status: 400 });
  }

  const db = await readDB();

  if (type === "Trial") {
    const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
    if (!slot) return NextResponse.json({ error: "Slot not found." }, { status: 404 });

    const requiredGroup = requiredGroupForBookingType(type);
    if (!groupMatches(serviceGroupOf(db, slot.ServiceID), requiredGroup)) {
      return NextResponse.json(
        { error: `${type} accounts can only book ${requiredGroup}-open services.` },
        { status: 400 }
      );
    }

    const alreadyRequested = db.trialItems.some(
      (t) => t.ScheduleItemID === scheduleId && t.TrialAccID === userId && t.Status !== "Rejected"
    );
    if (alreadyRequested) {
      return NextResponse.json({ error: "You already requested this slot." }, { status: 409 });
    }
    const item = {
      TrialID: nextId(db, "TRI"),
      TrialAccID: userId,
      ScheduleItemID: scheduleId,
      ServiceID: slot.ServiceID,
      Feedback: "",
      Status: "Pending",
      ServiceAdded: false,
    };
    db.trialItems.push(item);
    await writeDB(db);
    return NextResponse.json({ trialItem: item });
  }

  // Interview (any of the three tracks): no scheduleId — just a Service.
  const service = db.services.find((s) => s.ServiceID === serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const requiredGroup = requiredGroupForBookingType(type);
  if (!groupMatches(service.Group, requiredGroup)) {
    return NextResponse.json(
      { error: `${type} accounts can only interview for ${requiredGroup}-open services.` },
      { status: 400 }
    );
  }

  const alreadyRequested = db.interviewItems.some(
    (i) => i.ServiceID === serviceId && i.InterviewAccID === userId && i.Status !== "Rejected"
  );
  if (alreadyRequested) {
    return NextResponse.json({ error: "You already have a request in progress for this service." }, { status: 409 });
  }
  const item = {
    InterviewID: nextId(db, "IVW"),
    InterviewAccID: userId,
    ScheduleItemID: "",
    ServiceID: serviceId,
    TaskSubmissionLink: "",
    TaskFeedback: "",
    Status: "Pending",
  };
  db.interviewItems.push(item);
  await writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

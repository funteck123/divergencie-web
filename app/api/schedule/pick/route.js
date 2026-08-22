import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requiredGroupForBookingType, groupMatches, BOOKING_TYPES } from "@/lib/scheduleGen";
import { requireSelfOrManagement } from "@/lib/authz";

// body:
//   Trial:    { userId, type: "Trial", serviceId }, TKT-0080: no slot
//             picker for Trial accounts anymore either (matches Interview's
//             existing pattern below, TKT-0021). This only records the
//             request against a Service; Management assigns the actual
//             slot (an existing open one, or a newly created one via POST
//             /api/schedule) when approving it via PATCH
//             /api/schedule/requests.
//   Interview: { userId, type: "TeacherInterview"|"StaffInterview"|
//             "AmbassadorInterview", serviceId }, TKT-0021: no slot picker
//             for Interview accounts anymore. This only records the request
//             against a Service; Management assigns the actual slot (an
//             existing open one, or a newly created one via POST
//             /api/schedule) when approving it via PATCH
//             /api/schedule/requests.
// Multiple accounts may request the same slot/service ("double booking"),
// Management approves one via PATCH /api/schedule/requests, which is what
// actually locks a slot (see isSlotBooked). This route only records a
// Pending request.
export async function POST(req) {
  const { serviceId, userId, type } = await req.json();
  const { error } = requireSelfOrManagement(req, userId);
  if (error) return error;

  if (!BOOKING_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${BOOKING_TYPES.join("/")}.` }, { status: 400 });
  }

  const db = await readDB();

  if (type === "Trial") {
    const service = db.services.find((s) => s.ServiceID === serviceId);
    if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

    const requiredGroup = requiredGroupForBookingType(type);
    if (!groupMatches(service.Group, requiredGroup)) {
      return NextResponse.json(
        { error: `${type} accounts can only book ${requiredGroup}-open services.` },
        { status: 400 }
      );
    }

    const alreadyRequested = db.trialItems.some(
      (t) => t.ServiceID === serviceId && t.TrialAccID === userId && t.Status !== "Rejected"
    );
    if (alreadyRequested) {
      return NextResponse.json({ error: "You already have a request in progress for this service." }, { status: 409 });
    }
    const item = {
      TrialID: await nextId(db, "TRI"),
      TrialAccID: userId,
      ScheduleItemID: "",
      ServiceID: serviceId,
      Feedback: "",
      Status: "Pending",
      ServiceAdded: false,
    };
    db.trialItems.push(item);
    await writeDB(db, ["trialItems"]);
    return NextResponse.json({ trialItem: item });
  }

  // Interview (any of the three tracks): no scheduleId, just a Service.
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
    InterviewID: await nextId(db, "IVW"),
    InterviewAccID: userId,
    ScheduleItemID: "",
    ServiceID: serviceId,
    TaskSubmissionLink: "",
    TaskFeedback: "",
    Status: "Pending",
  };
  db.interviewItems.push(item);
  await writeDB(db, ["interviewItems"]);
  return NextResponse.json({ interviewItem: item });
}

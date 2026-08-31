// Management-persona NPC actions. Require a Management-scoped API key (the
// NPC "playing" Management), and their whole job is turning the crank on
// OTHER NPCs' pending requests -- exactly the "management person whose job
// is to take feedback" role that was asked for. v1 policy is deliberately
// the simplest possible deterministic rule: approve/advance everything
// pending. A more selective policy (reject some fraction, hold others) is a
// natural next step, not built yet.
import { callApi, callChecked } from "./http";

// GET /api/regforms, approves every Pending one, records the returned
// username/password into ctx.approvals keyed by RegFormID so the
// applicant's own claim_account_credentials can pick it up on its next
// tick. Loops over multiple sub-requests -- left calling callApi directly
// rather than callChecked, whose single-request shape doesn't fit a loop.
export async function reviewRegistrations(npc, params, ctx) {
  const { ok, status, body } = await callApi(ctx, "GET", "/api/regforms");
  if (!ok) {
    return { flags: { issueFound: true, issueDetail: `GET /api/regforms failed (${status})` }, log: "review_registrations: list failed" };
  }
  const pending = (body.regForms || []).filter((f) => f.Status === "Pending");
  let approved = 0;
  for (const form of pending) {
    const res = await callApi(ctx, "PATCH", "/api/regforms", { regFormId: form.RegFormID, action: "approve" });
    if (res.ok) {
      ctx.approvals[form.RegFormID] = { username: res.body.credentials.username, password: res.body.credentials.password, name: form.Name };
      approved += 1;
    }
  }
  return { flags: { lastReviewApproved: approved }, log: `review_registrations: approved ${approved}/${pending.length} pending` };
}

// POST /api/interview-offer {action:"send"} -- params.interviewId required.
// No list endpoint exposes "every interview item currently TaskSubmitted"
// in the real app, so this doesn't discover its own queue, same shape as
// convert_account/close_ticket below.
export async function sendInterviewOffer(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/interview-offer", {
    interviewId: params.interviewId,
    action: "send",
    feedback: params.feedback,
    offerLetterLink: params.offerLetterLink || "https://example.invalid/offer-letter.pdf",
  }, "send_interview_offer");
  if (res.failed) return res.result;
  return { flags: {}, log: `send_interview_offer: sent for ${params.interviewId}` };
}

// POST /api/convert {accountId} -- converts a ready TrialAcc/InterviewAcc
// (FeedbackSubmitted / OfferAccepted respectively) into its final account
// type. params.accountId is required; "ready to convert" isn't exposed as
// a single list endpoint in the real app, so this doesn't discover
// candidates on its own.
export async function convertAccount(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/convert", { accountId: params.accountId }, "convert_account");
  if (res.failed) return res.result;
  return { flags: {}, log: `convert_account: ${params.accountId} -> ${res.body.newUser?.UserID}` };
}

// PATCH /api/tickets {action:"close"} -- params.ticketId required, same
// "doesn't discover its own queue" shape as convert_account above.
export async function closeTicket(npc, params, ctx) {
  const res = await callChecked(ctx, "PATCH", "/api/tickets", {
    ticketId: params.ticketId,
    action: "close",
    closeMessage: params.closeMessage || "Closed by Management-Sim (npc-sim v1).",
  }, "close_ticket");
  if (res.failed) return res.result;
  return { flags: {}, log: `close_ticket: closed ${params.ticketId}` };
}

// GET /api/schedule/requests, then for every pending Trial/Interview
// request, GET /api/schedule (unfiltered) to find an existing open slot for
// the same Service, and PATCH approve with the first one that isn't already
// booked -- the real route itself enforces same-Service and not-already-
// booked (409), so trying candidates in order and moving on past a 409 is
// enough, no need to duplicate that logic client-side. Leaves a request
// alone (not an issue) if no open slot exists yet for its Service.
export async function reviewScheduleRequests(npc, params, ctx) {
  const { ok, status, body } = await callApi(ctx, "GET", "/api/schedule/requests");
  if (!ok) {
    return { flags: { issueFound: true, issueDetail: `GET /api/schedule/requests failed (${status})` }, log: "review_schedule_requests: list failed" };
  }
  const { ok: slotsOk, body: slotsBody } = await callApi(ctx, "GET", "/api/schedule");
  const allSlots = slotsOk ? slotsBody.scheduleItems || [] : [];

  let scheduled = 0;
  const queue = [
    ...(body.pendingTrials || []).map((t) => ({ type: "Trial", id: t.TrialID, serviceId: t.ServiceID })),
    ...(body.pendingInterviews || []).map((i) => ({ type: i.RequesterType === "TeacherInterviewAcc" ? "TeacherInterview" : i.RequesterType === "StaffInterviewAcc" ? "StaffInterview" : "AmbassadorInterview", id: i.InterviewID, serviceId: i.ServiceID })),
  ];
  for (const req of queue) {
    const candidates = allSlots.filter((s) => s.ServiceID === req.serviceId);
    for (const slot of candidates) {
      const res = await callApi(ctx, "PATCH", "/api/schedule/requests", { type: req.type, id: req.id, action: "approve", scheduleId: slot.ScheduleID });
      if (res.ok) {
        scheduled += 1;
        break;
      }
      // a 409 (already booked) just means try the next candidate slot
    }
  }
  return { flags: { lastReviewScheduled: scheduled }, log: `review_schedule_requests: scheduled ${scheduled}/${queue.length} pending` };
}

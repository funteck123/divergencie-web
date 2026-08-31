// Self-service NPC actions -- anything a Student/Teacher/Staff/Ambassador/
// Trial/Interview account does for itself. See ../README.md for the full
// per-action route mapping and live-verification status.
import { callApi, callApiForm, callChecked, mintApiKeyFromCredentials } from "./http";

// GET /api/me -- this NPC's own dashboard bundle, including its
// enrollment-filtered scheduleItems (see project_divergencie_two_scheduleitems_sources
// memory: /api/me's list is exactly what a real logged-in user would see,
// unlike /api/schedule's unfiltered one, so this is the right endpoint for
// "what does MY day look like").
export async function checkSchedule(npc, params, ctx) {
  const res = await callChecked(ctx, "GET", `/api/me?userId=${npc.account.userId}`, undefined, "check_schedule");
  if (res.failed) return res.result;
  const today = ctx.today; // "YYYY-MM-DD"
  const todaysItem = (res.body.scheduleItems || []).find((s) => s.Date === today);
  if (todaysItem) {
    return {
      flags: { hasClassToday: true, todayScheduleId: todaysItem.ScheduleID },
      log: `check_schedule: found session ${todaysItem.ScheduleID} today`,
    };
  }
  return { flags: { hasClassToday: false, todayScheduleId: null }, log: "check_schedule: nothing scheduled today" };
}

// POST /api/attendance/log as self, only if check_schedule already found a
// real session today. Deterministic rule for "found an issue": anything
// other than success, or the specific known "already logged" 400, counts as
// a real problem worth a ticket. Custom error handling (the "already
// logged" carve-out) -- left calling callApi directly rather than
// callChecked, whose generic failure shape doesn't distinguish that case.
export async function logAttendance(npc, params, ctx) {
  const scheduleItemId = npc.state.flags.todayScheduleId;
  if (!scheduleItemId) {
    return { flags: {}, log: "log_attendance: skipped, no session today" };
  }
  const { ok, status, body } = await callApi(ctx, "POST", "/api/attendance", {
    scheduleItemId,
    userId: npc.account.userId,
    status: params.status || "Present",
    loggedDuration: params.loggedDuration,
  });
  if (ok) {
    return { flags: { issueFound: false }, log: `log_attendance: logged ${params.status || "Present"} for ${scheduleItemId}` };
  }
  const alreadyLogged = status === 400 && /already logged/i.test(body?.error || "");
  if (alreadyLogged) {
    return { flags: { issueFound: false }, log: "log_attendance: already logged today, not an issue" };
  }
  return {
    flags: { issueFound: true, issueDetail: `POST /api/attendance/log failed (${status}) for ${scheduleItemId}: ${body?.error || JSON.stringify(body)}` },
    log: `log_attendance: unexpected error ${status}`,
  };
}

// POST /api/tickets, only when a prior step's deterministic rule actually
// set issueFound -- never files a ticket on a normal, uneventful day.
export async function submitFeedback(npc, params, ctx) {
  if (!npc.state.flags.issueFound) {
    return { flags: {}, log: "submit_feedback: nothing to report" };
  }
  const message = `[NPC:${npc.persona.name}] ${npc.state.flags.issueDetail || "Unspecified issue encountered during scripted use."}`;
  const { ok, status, body } = await callApi(ctx, "POST", "/api/tickets", { message });
  if (!ok) {
    return { flags: {}, log: `submit_feedback: failed to file ticket (${status}): ${JSON.stringify(body)}` };
  }
  return { flags: { issueFound: false, lastTicketId: body?.ticket?.TicketID || null }, log: `submit_feedback: filed ${body?.ticket?.TicketID}` };
}

// POST /api/register, the one action in this whole library with no API key
// (an applicant doesn't have an account yet). params.requestedType is one
// of "Trial"/"TeacherInterview"/"StaffInterview"/"AmbassadorInterview".
export async function applyRegistration(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/register", {
    name: npc.persona.name,
    email: npc.persona.email || "",
    requestedType: params.requestedType,
  }, "apply_registration");
  if (res.failed) return res.result;
  return {
    flags: { regFormId: res.body.regForm.RegFormID, hasAccount: false },
    log: `apply_registration: submitted ${res.body.regForm.RegFormID} as ${params.requestedType}`,
  };
}

// No API call -- reads the shared approvals ledger (ctx.approvals, loaded/
// saved by engine.js around every tick) that a Management-persona NPC's
// review_registrations action writes into. Only mints real credentials
// once this NPC's own regFormId shows up there approved.
//
// NOT gated with a script-level "waitUntil": the only flag that could prove
// "ready" (hasAccount) is one only THIS action itself can ever set, so a
// waitUntil condition here can never become true on its own -- a
// chicken-and-egg bug caught before this ever ran. Instead this action
// reports its own "still waiting" state back via { wait: true }, which
// engine.js treats the same way it treats a false waitUntil: log it, don't
// advance the cursor, try again next tick.
export async function claimAccountCredentials(npc, params, ctx) {
  const approval = ctx.approvals[npc.state.flags.regFormId];
  if (!approval) {
    return { wait: true, flags: {}, log: "claim_account_credentials: not approved yet" };
  }
  try {
    const { userId, apiKey } = await mintApiKeyFromCredentials(ctx.baseUrl, approval.username, approval.password, `npc-sim:${npc.persona.name}`);
    return {
      account: { userId, apiKey },
      flags: { hasAccount: true },
      log: `claim_account_credentials: claimed ${userId}, minted own API key`,
    };
  } catch (e) {
    return { flags: { issueFound: true, issueDetail: `claim_account_credentials failed: ${e.message}` }, log: "claim_account_credentials: mint failed" };
  }
}

// POST /api/schedule/pick, Trial or Interview track (params.type). Trial
// needs only serviceId; Interview additionally requires a Resume already
// on file (see uploadInterviewProfile), the real app rejects the request
// otherwise -- that's an actual validation rule, not this engine's own.
export async function requestSlot(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/schedule/pick", {
    serviceId: params.serviceId,
    userId: npc.account.userId,
    type: params.type,
  }, "request_slot");
  if (res.failed) return res.result;
  // /swe review, MEDIUM finding: this used to assume "if not trialItem,
  // must be interviewItem" and read .InterviewID unconditionally -- a
  // response-shape change would throw instead of reporting an issue.
  if (res.body.trialItem) {
    return { flags: { trialId: res.body.trialItem.TrialID, trialStatus: "Pending" }, log: `request_slot: trial request ${res.body.trialItem.TrialID}` };
  }
  if (res.body.interviewItem) {
    return { flags: { interviewId: res.body.interviewItem.InterviewID, interviewStatus: "Pending" }, log: `request_slot: interview request ${res.body.interviewItem.InterviewID}` };
  }
  return { flags: { issueFound: true, issueDetail: `POST /api/schedule/pick returned neither trialItem nor interviewItem: ${JSON.stringify(res.body)}` }, log: "request_slot: unexpected response shape" };
}

// PATCH /api/interview-profile -- a Resume link is required before
// request_slot's Interview branch will succeed. params.resumeUrl falls
// back to an obviously-fake placeholder link, this is disposable test data.
export async function uploadInterviewProfile(npc, params, ctx) {
  const res = await callChecked(ctx, "PATCH", "/api/interview-profile", {
    userId: npc.account.userId,
    resumeUrl: params.resumeUrl || `https://example.invalid/resume-${npc.account.userId}.pdf`,
    email: params.email,
    whatsappNumber: params.whatsappNumber,
  }, "upload_interview_profile");
  if (res.failed) return res.result;
  return { flags: { hasResume: true }, log: "upload_interview_profile: resume on file" };
}

// POST /api/interview-task -- only meaningful once Management has actually
// sent a task. Script should gate this with "waitUntil": "interviewStatus==Scheduled".
export async function submitInterviewTask(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/interview-task", {
    interviewId: npc.state.flags.interviewId,
    link: params.link || "https://example.invalid/task-submission",
  }, "submit_interview_task");
  if (res.failed) return res.result;
  return { flags: { interviewStatus: "TaskSubmitted" }, log: "submit_interview_task: submitted" };
}

// POST /api/interview-offer {action:"accept"} -- self-service, only valid
// once Management has sent an offer. Gate with "waitUntil": "interviewStatus==OfferSent".
export async function acceptInterviewOffer(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/interview-offer", {
    interviewId: npc.state.flags.interviewId,
    action: "accept",
  }, "accept_interview_offer");
  if (res.failed) return res.result;
  return { flags: { interviewStatus: "OfferAccepted" }, log: "accept_interview_offer: accepted" };
}

// POST /api/trial-feedback -- self-authored, only valid once a Trial
// session has actually happened. Gate with "waitUntil".
export async function submitTrialFeedback(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/trial-feedback", {
    trialId: npc.state.flags.trialId,
    feedback: params.feedback || "Enjoyed the trial session, would like to enroll.",
  }, "submit_trial_feedback");
  if (res.failed) return res.result;
  return { flags: { trialStatus: "FeedbackSubmitted" }, log: "submit_trial_feedback: submitted" };
}

// POST /api/invoices/mark-paid, multipart, a real file attachment required
// by the route itself. params.fileContent/fileName fall back to obviously-
// fake disposable test content -- exactly the "attaches some random sample
// file" behavior described for the Student/Parent money-marking action.
export async function markInvoicePaid(npc, params, ctx) {
  const fileContent = params.fileContent || "npc-sim disposable payment proof, not a real receipt";
  const file = new Blob([fileContent], { type: "text/plain" });
  const { ok, status, body } = await callApiForm(ctx, "/api/invoices/mark-paid", {
    invoiceId: npc.state.flags.invoiceId || params.invoiceId,
    file: new File([file], params.fileName || "proof.txt", { type: "text/plain" }),
  });
  if (!ok) {
    return { flags: { issueFound: true, issueDetail: `POST /api/invoices/mark-paid failed (${status}): ${body?.error}` }, log: `mark_invoice_paid: error ${status}` };
  }
  return { flags: {}, log: `mark_invoice_paid: marked ${body.invoice?.InvoiceID} paid` };
}

// PATCH /api/paychecks {paycheckId, staffReceivedFlag: true} -- the
// Teacher/Staff/Ambassador side of the same self-service money action. No
// attachment support exists on this route (confirmed while mapping the
// app, real asymmetry vs invoices) -- flag-only, per the "paychecks stay
// flag-only" decision.
export async function markPaycheckReceived(npc, params, ctx) {
  const res = await callChecked(ctx, "PATCH", "/api/paychecks", {
    paycheckId: npc.state.flags.paycheckId || params.paycheckId,
    staffReceivedFlag: true,
  }, "mark_paycheck_received");
  if (res.failed) return res.result;
  return { flags: {}, log: `mark_paycheck_received: marked ${res.body.paycheck?.PaycheckID} received` };
}

// POST /api/schedule/reschedule-requests -- only valid for a session this
// NPC is actually enrolled in (the real route checks isTiedToSlot).
export async function requestReschedule(npc, params, ctx) {
  const res = await callChecked(ctx, "POST", "/api/schedule/reschedule-requests", {
    scheduleId: npc.state.flags.todayScheduleId || params.scheduleId,
    userId: npc.account.userId,
    requestedDate: params.requestedDate,
    requestedTime: params.requestedTime,
  }, "request_reschedule");
  if (res.failed) return res.result;
  return { flags: {}, log: `request_reschedule: requested ${res.body.rescheduleRequest?.RescheduleRequestID}` };
}

// GET /api/guides -- any authenticated role, read-only, the lowest-risk
// "reach this corner of the app" action there is.
export async function viewGuides(npc, params, ctx) {
  const res = await callChecked(ctx, "GET", "/api/guides", undefined, "view_guides");
  if (res.failed) return res.result;
  return { flags: { guideCount: (res.body.guides || []).length }, log: `view_guides: saw ${(res.body.guides || []).length} guides` };
}

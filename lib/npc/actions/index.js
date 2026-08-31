// Deterministic NPC action library, v1, no LLM anywhere in this module.
// Split into self.js (self-service, any account type) and management.js
// (Management-persona only) per the /swe review's God-module finding --
// this file just merges both into the one ACTIONS table engine.js expects,
// plus re-exports evalCondition.
import {
  checkSchedule,
  logAttendance,
  submitFeedback,
  applyRegistration,
  claimAccountCredentials,
  requestSlot,
  uploadInterviewProfile,
  submitInterviewTask,
  acceptInterviewOffer,
  submitTrialFeedback,
  markInvoicePaid,
  markPaycheckReceived,
  requestReschedule,
  viewGuides,
} from "./self";
import {
  reviewRegistrations,
  sendInterviewOffer,
  convertAccount,
  closeTicket,
  reviewScheduleRequests,
} from "./management";

export { evalCondition } from "./http";

export const ACTIONS = {
  check_schedule: checkSchedule,
  log_attendance: logAttendance,
  submit_feedback: submitFeedback,
  apply_registration: applyRegistration,
  claim_account_credentials: claimAccountCredentials,
  request_slot: requestSlot,
  upload_interview_profile: uploadInterviewProfile,
  submit_interview_task: submitInterviewTask,
  accept_interview_offer: acceptInterviewOffer,
  submit_trial_feedback: submitTrialFeedback,
  mark_invoice_paid: markInvoicePaid,
  mark_paycheck_received: markPaycheckReceived,
  request_reschedule: requestReschedule,
  view_guides: viewGuides,
  review_registrations: reviewRegistrations,
  send_interview_offer: sendInterviewOffer,
  convert_account: convertAccount,
  close_ticket: closeTicket,
  review_schedule_requests: reviewScheduleRequests,
};

import { timezoneLabel } from "@/lib/timezones";

export interface TrialItem {
  TrialID: string;
  TrialAccID: string;
  ServiceID: string;
  Status: string;
  ServiceAdded?: boolean;
  ScheduleItemID?: string;
  Feedback?: string;
}
export interface InterviewItem {
  InterviewID: string;
  InterviewAccID: string;
  ServiceID: string;
  Status: string;
  ScheduleItemID?: string;
  TaskSubmissionLink?: string;
  TaskFeedback?: string;
  TaskSentAt?: string;
  OfferLetterLink?: string;
  OfferSentAt?: string;
  OfferAcceptedAt?: string;
}

export const TRIAL_STEPS = ["Pending", "Scheduled", "Feedback", "Service Added"];
export const INTERVIEW_STEPS = ["Pending", "Scheduled", "Task Submitted", "Offer Sent", "Accepted"];

export function trialStepIndex(t: Pick<TrialItem, "ServiceAdded" | "Status">): number {
  if (t.ServiceAdded) return 3;
  if (t.Status === "FeedbackSubmitted") return 2;
  if (t.Status === "Scheduled") return 1;
  return 0;
}
export function interviewStepIndex(i: Pick<InterviewItem, "Status">): number {
  if (i.Status === "OfferAccepted") return 4;
  if (i.Status === "OfferSent") return 3;
  if (i.Status === "TaskSubmitted") return 2;
  if (i.Status === "Scheduled") return 1;
  return 0;
}
/** Rejected and waitlisted are end states that sit outside the step line. */
export const trialDeadEnd = (t: TrialItem) => (t.Status === "Rejected" ? "Rejected" : null);
export const interviewDeadEnd = (i: InterviewItem) => (i.Status === "Rejected" ? "Rejected" : i.Status === "Waitlisted" ? "Waitlisted" : null);

export const TRIAL_STATUS_FILTER_LABEL: Record<string, string> = { all: "All statuses", pending: "Pending", scheduled: "Scheduled", feedback: "Feedback submitted", "service-added": "Service added", rejected: "Rejected" };
export function trialMatches(t: TrialItem, f: string): boolean {
  switch (f) {
    case "pending": return t.Status === "Pending";
    case "scheduled": return t.Status === "Scheduled";
    case "feedback": return t.Status === "FeedbackSubmitted" && !t.ServiceAdded;
    case "service-added": return !!t.ServiceAdded;
    case "rejected": return t.Status === "Rejected";
    default: return true;
  }
}
export const INTERVIEW_STATUS_FILTER_LABEL: Record<string, string> = { all: "All statuses", pending: "Pending", scheduled: "Scheduled", "task-submitted": "Task submitted", "offer-sent": "Offer sent", accepted: "Accepted", waitlisted: "Waitlisted", rejected: "Rejected" };
export function interviewMatches(i: InterviewItem, f: string): boolean {
  switch (f) {
    case "pending": return i.Status === "Pending";
    case "scheduled": return i.Status === "Scheduled";
    case "task-submitted": return i.Status === "TaskSubmitted";
    case "offer-sent": return i.Status === "OfferSent";
    case "accepted": return i.Status === "OfferAccepted";
    case "waitlisted": return i.Status === "Waitlisted";
    case "rejected": return i.Status === "Rejected";
    default: return true;
  }
}

/**
 * May this pending account be converted yet? Looks at every item of the account (TKT-0113, TKT-0124): an interview must be
 * accepted, a trial must have feedback submitted, an account with neither can convert.
 */
export function conversionEligible(accountId: string, interviews: readonly InterviewItem[], trials: readonly TrialItem[]): boolean {
  const mine = interviews.filter((i) => i.InterviewAccID === accountId);
  if (mine.length) return mine.some((i) => i.Status === "OfferAccepted");
  const t = trials.filter((x) => x.TrialAccID === accountId);
  if (t.length) return t.some((x) => x.Status === "FeedbackSubmitted");
  return true;
}

const TRIAL_ZOOM_BLOCK = `DivergenCIE Coaching Classroom (Official)

Join Zoom Meeting
https://us05web.zoom.us/j/82245071438?pwd=cv7NwRqIZyP4axAhsbRvvFfpcBja3S.1


Meeting ID: 822 4507 1438
Passcode: a000000000
---

Join by Skype for Business
https://us05web.zoom.us/skype/82245071438

Note: If there is any technical problem with the meeting, please inform us within 5 minutes. You can try using the meeting ID.`;

const TZ_ADJECTIVE: Record<string, string> = { India: "Indian", UK: "British", Saudi: "Saudi", Pakistan: "Pakistani", UAE: "UAE" };

export function formatTrialTime(time24: string): string {
  const [h = 0, m = 0] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
export function formatTrialDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} Minutes`;
  return `${hours} Hour${hours === 1 ? "" : "s"}`;
}

/** The WhatsApp message for a booked trial class. Kept character for character: staff paste it as it is. */
export function buildTrialMessage({ studentName, serviceName, slot }: { studentName: string; serviceName: string; slot: { Date: string; Time: string; Timezone?: string; Duration: number | string } }): string {
  const date = new Date(`${slot.Date}T00:00:00`);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const fullDate = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = formatTrialTime(slot.Time);
  const tzNoun = slot.Timezone ? (timezoneLabel(slot.Timezone) as string) : "";
  const tzWord = tzNoun ? `${TZ_ADJECTIVE[tzNoun] || tzNoun} Time` : "";
  const durationStr = formatTrialDuration(Number(slot.Duration));
  return `Hello ${studentName} ✨

I hope you're doing great. We are hoping to see you in the classes on the following day and time:

*${serviceName} Trial Class*
Day: ${weekday}, ${fullDate}
Time: ${timeStr}${tzWord ? ` ${tzWord}` : ""}
Duration: ${durationStr}

*The meeting link will be the same for all your classes.*


${TRIAL_ZOOM_BLOCK}`;
}

/** Booking type the schedule API wants, from a pending interview's requester type. */
export const bookingTypeOfInterview = (requesterType?: string) => (requesterType ? requesterType.replace(/Acc$/, "") : "StaffInterview");

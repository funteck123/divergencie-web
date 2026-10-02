import { describe, expect, it } from "vitest";
import { bookingTypeOfInterview, buildTrialMessage, conversionEligible, formatTrialDuration, formatTrialTime, interviewMatches, interviewStepIndex, trialMatches, trialStepIndex } from "./pipelineLogic";

describe("steps", () => {
  it("trial", () => {
    expect(trialStepIndex({ Status: "Pending" })).toBe(0);
    expect(trialStepIndex({ Status: "Scheduled" })).toBe(1);
    expect(trialStepIndex({ Status: "FeedbackSubmitted" })).toBe(2);
    expect(trialStepIndex({ Status: "FeedbackSubmitted", ServiceAdded: true })).toBe(3);
  });
  it("interview", () => expect(["Pending", "Scheduled", "TaskSubmitted", "OfferSent", "OfferAccepted"].map((Status) => interviewStepIndex({ Status }))).toEqual([0, 1, 2, 3, 4]));
});

describe("filters", () => {
  it("feedback excludes trials already added", () => {
    expect(trialMatches({ TrialID: "1", TrialAccID: "a", ServiceID: "s", Status: "FeedbackSubmitted" }, "feedback")).toBe(true);
    expect(trialMatches({ TrialID: "1", TrialAccID: "a", ServiceID: "s", Status: "FeedbackSubmitted", ServiceAdded: true }, "feedback")).toBe(false);
  });
  it("interview accepted and waitlisted", () => {
    expect(interviewMatches({ InterviewID: "1", InterviewAccID: "a", ServiceID: "s", Status: "OfferAccepted" }, "accepted")).toBe(true);
    expect(interviewMatches({ InterviewID: "1", InterviewAccID: "a", ServiceID: "s", Status: "Waitlisted" }, "waitlisted")).toBe(true);
  });
});

describe("conversion", () => {
  const i = (Status: string) => ({ InterviewID: "i", InterviewAccID: "A", ServiceID: "s", Status });
  const t = (Status: string) => ({ TrialID: "t", TrialAccID: "B", ServiceID: "s", Status });
  it("interview needs an accepted offer, judged on every item", () => {
    expect(conversionEligible("A", [i("Rejected"), i("OfferAccepted")], [])).toBe(true);
    expect(conversionEligible("A", [i("OfferSent")], [])).toBe(false);
  });
  it("trial needs feedback", () => {
    expect(conversionEligible("B", [], [t("Scheduled")])).toBe(false);
    expect(conversionEligible("B", [], [t("FeedbackSubmitted")])).toBe(true);
  });
  it("no items means it can convert", () => expect(conversionEligible("C", [], [])).toBe(true));
});

describe("trial message", () => {
  it("time and duration wording", () => {
    expect(formatTrialTime("00:30")).toBe("12:30 AM");
    expect(formatTrialTime("13:05")).toBe("1:05 PM");
    expect(formatTrialDuration(0.5)).toBe("30 Minutes");
    expect(formatTrialDuration(1)).toBe("1 Hour");
    expect(formatTrialDuration(1.5)).toBe("1.5 Hours");
  });
  it("matches the classic layout", () => {
    const m = buildTrialMessage({ studentName: "Sam", serviceName: "Physics", slot: { Date: "2026-10-05", Time: "17:00", Timezone: "Asia/Kolkata", Duration: 1 } });
    expect(m.startsWith("Hello Sam ✨\n\nI hope you're doing great.")).toBe(true);
    expect(m).toContain("*Physics Trial Class*\nDay: Monday, 5 October 2026\nTime: 5:00 PM Indian Time\nDuration: 1 Hour\n");
    expect(m).toContain("*The meeting link will be the same for all your classes.*\n\n\nDivergenCIE Coaching Classroom (Official)");
    expect(m.endsWith("You can try using the meeting ID.")).toBe(true);
  });
  it("leaves the zone word out when the slot has no timezone", () => {
    expect(buildTrialMessage({ studentName: "S", serviceName: "P", slot: { Date: "2026-10-05", Time: "09:00", Duration: 2 } })).toContain("Time: 9:00 AM\nDuration: 2 Hours");
  });
  it("booking type of an interview request", () => {
    expect(bookingTypeOfInterview("TeacherInterviewAcc")).toBe("TeacherInterview");
    expect(bookingTypeOfInterview(undefined)).toBe("StaffInterview");
  });
});

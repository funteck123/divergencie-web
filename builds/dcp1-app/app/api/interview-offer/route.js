import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireManagement, requireSelfOrManagement } from "@/lib/authz";

// body: { interviewId, action: "send" | "accept" | "waitlist" | "reject" | "unsend", feedback?, offerLetterLink? }
// "feedback" is Management's note on the task submission, left when sending
// the offer — the Interview-side counterpart to Trial's account-authored Feedback.
// "offerLetterLink" is the document the InterviewAcc opens to view/accept.
// "send" doubles as edit — calling it again while already OfferSent
// overwrites the link/feedback in place.
export async function POST(req) {
  const { interviewId, action, feedback, offerLetterLink } = await req.json();
  const db = readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

  // "accept" is the interviewee accepting their own offer; every other
  // action (send/waitlist/reject/unsend) is a Management-only decision.
  const { error } = action === "accept"
    ? requireSelfOrManagement(req, item.InterviewAccID)
    : requireManagement(req);
  if (error) return error;

  if (action === "send") {
    if (feedback !== undefined) item.TaskFeedback = feedback;
    if (offerLetterLink !== undefined) item.OfferLetterLink = offerLetterLink;
    item.Status = "OfferSent";
  } else if (action === "accept") {
    item.Status = "OfferAccepted";
  } else if (action === "waitlist") {
    if (feedback !== undefined) item.TaskFeedback = feedback;
    item.Status = "Waitlisted";
  } else if (action === "reject") {
    if (feedback !== undefined) item.TaskFeedback = feedback;
    item.Status = "Rejected";
  } else if (action === "unsend") {
    // Reverts an OfferSent back to TaskSubmitted; link/feedback stay stored
    // so the outcome form can prefill them if Management re-sends.
    item.Status = "TaskSubmitted";
  } else {
    return NextResponse.json({ error: "action must be send, accept, waitlist, reject, or unsend." }, { status: 400 });
  }
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

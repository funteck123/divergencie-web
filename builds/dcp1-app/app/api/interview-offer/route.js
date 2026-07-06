import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// body: { interviewId, action: "send" | "accept" | "waitlist" | "reject", feedback?, offerLetterLink? }
// "feedback" is Management's note on the task submission, left when sending
// the offer — the Interview-side counterpart to Trial's account-authored Feedback.
// "offerLetterLink" is the document the InterviewAcc opens to view/accept.
export async function POST(req) {
  const { interviewId, action, feedback, offerLetterLink } = await req.json();
  const db = readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

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
  } else {
    return NextResponse.json({ error: "action must be send, accept, waitlist, or reject." }, { status: 400 });
  }
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// body: { interviewId, action: "send" | "accept", feedback? }
// "feedback" is Management's note on the task submission, left when sending
// the offer — the Interview-side counterpart to Trial's account-authored Feedback.
export async function POST(req) {
  const { interviewId, action, feedback } = await req.json();
  const db = readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

  if (action === "send") {
    if (feedback !== undefined) item.TaskFeedback = feedback;
    item.Status = "OfferSent";
  } else if (action === "accept") {
    item.Status = "OfferAccepted";
  } else {
    return NextResponse.json({ error: "action must be send or accept." }, { status: 400 });
  }
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

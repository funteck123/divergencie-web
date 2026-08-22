import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireManagement, requireSelfOrManagement } from "@/lib/authz";

// body: { interviewId, link }
export async function POST(req) {
  const { interviewId, link } = await req.json();
  const db = await readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

  const { error } = requireSelfOrManagement(req, item.InterviewAccID);
  if (error) return error;

  item.TaskSubmissionLink = link;
  item.Status = "TaskSubmitted";
  await writeDB(db, ["interviewItems"]);
  return NextResponse.json({ interviewItem: item });
}

// TKT-0119: Management-only "Send Task" step. The candidate's own
// submit-task box only shows once TaskSentAt is stamped, not just because
// Status reached "Scheduled" -- the interview itself still needs to happen
// first.
// body: { interviewId }
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { interviewId } = await req.json();
  const db = await readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });
  if (item.Status !== "Scheduled") {
    return NextResponse.json({ error: "Can only send a task while the interview is Scheduled." }, { status: 400 });
  }

  item.TaskSentAt = new Date().toISOString();
  await writeDB(db, ["interviewItems"]);
  return NextResponse.json({ interviewItem: item });
}

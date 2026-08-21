import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSelfOrManagement } from "@/lib/authz";

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

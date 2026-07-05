import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// body: { interviewId, link }
export async function POST(req) {
  const { interviewId, link } = await req.json();
  const db = readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

  item.TaskSubmissionLink = link;
  item.Status = "TaskSubmitted";
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

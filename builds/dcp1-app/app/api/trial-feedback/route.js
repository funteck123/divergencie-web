import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// body: { trialId, feedback }
export async function POST(req) {
  const { trialId, feedback } = await req.json();
  const db = readDB();
  const item = db.trialItems.find((t) => t.TrialID === trialId);
  if (!item) return NextResponse.json({ error: "Trial item not found." }, { status: 404 });

  item.Feedback = feedback;
  item.Status = "FeedbackSubmitted";
  writeDB(db);
  return NextResponse.json({ trialItem: item });
}

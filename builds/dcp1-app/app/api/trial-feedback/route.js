import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSelfOrManagement } from "@/lib/authz";

// body: { trialId, feedback }
export async function POST(req) {
  const { trialId, feedback } = await req.json();
  const db = readDB();
  const item = db.trialItems.find((t) => t.TrialID === trialId);
  if (!item) return NextResponse.json({ error: "Trial item not found." }, { status: 404 });

  const { error } = requireSelfOrManagement(req, item.TrialAccID);
  if (error) return error;

  item.Feedback = feedback;
  item.Status = "FeedbackSubmitted";
  writeDB(db);
  return NextResponse.json({ trialItem: item });
}

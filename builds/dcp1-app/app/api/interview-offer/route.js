import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// body: { interviewId, action: "send" | "accept" }
export async function POST(req) {
  const { interviewId, action } = await req.json();
  const db = readDB();
  const item = db.interviewItems.find((i) => i.InterviewID === interviewId);
  if (!item) return NextResponse.json({ error: "Interview item not found." }, { status: 404 });

  if (action === "send") {
    item.Status = "OfferSent";
  } else if (action === "accept") {
    item.Status = "OfferAccepted";
  } else {
    return NextResponse.json({ error: "action must be send or accept." }, { status: 400 });
  }
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}

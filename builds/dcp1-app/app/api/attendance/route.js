import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json({ attendanceItems: db.attendanceItems });
}

// body: { scheduleItemId, userId, status, loggedDuration }
export async function POST(req) {
  const { scheduleItemId, userId, status, loggedDuration } = await req.json();
  const db = readDB();

  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleItemId);
  if (!slot) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  const already = db.attendanceItems.find(
    (a) => a.ScheduleItemID === scheduleItemId && a.UserID === userId
  );
  if (already) {
    return NextResponse.json({ error: "Attendance already logged for this session." }, { status: 400 });
  }

  const item = {
    AttendanceID: nextId(db, "ATT"),
    ScheduleItemID: scheduleItemId,
    UserID: userId,
    Date: slot.Date,
    Status: status || "Present",
    ScheduledDuration: Number(slot.Duration) || 0,
    LoggedDuration: Number(loggedDuration ?? slot.Duration) || 0,
    LoggedBy: userId,
  };
  db.attendanceItems.push(item);
  writeDB(db);
  return NextResponse.json({ attendanceItem: item });
}

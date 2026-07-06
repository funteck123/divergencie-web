import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawSchedule } from "@/lib/scheduleImage";

function buildEntries(db, userId) {
  const enrolledServiceIds = new Set(db.enrollments.filter((e) => e.UserID === userId).map((e) => e.ServiceID));
  const services = db.services.filter((s) => enrolledServiceIds.has(s.ServiceID));
  const entries = [];
  for (const s of services) {
    const label = s.Code ? `${s.Code} ${s.Name}` : s.Name;
    for (const o of s.OccuranceList || []) {
      entries.push({ name: label, day: o.Day, time: o.Time });
    }
  }
  return entries;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const download = searchParams.get("download") === "1";

  const db = readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!["Student", "Staff"].includes(user.UserType)) {
    return NextResponse.json({ error: "Schedule image only available for Student/Staff." }, { status: 400 });
  }

  const role = user.UserType === "Staff" ? "teacher" : "student";
  const entity = {
    name: user.Name,
    role,
    timezone: user.Timezone === "Saudi" ? "Saudi" : "India",
    // dcp1-app students can be enrolled across multiple unrelated Services,
    // unlike p26's one-class-per-student model — no single "class name" to show.
    className: "",
  };
  const entries = buildEntries(db, userId);

  const buffer = await drawSchedule(entity, entries);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="DC_Schedule_${user.Name}.png"`,
      "Cache-Control": "no-store",
    },
  });
}

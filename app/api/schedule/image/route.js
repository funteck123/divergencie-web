import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawSchedule } from "@/lib/scheduleImage";
import { normalizeTimezone } from "@/lib/timezones";
import { requireSelfOrParentOrManagement } from "@/lib/authz";

function buildEntries(db, userId) {
  const enrolledServiceIds = new Set(db.enrollments.filter((e) => e.UserID === userId).map((e) => e.ServiceID));
  const services = db.services.filter((s) => enrolledServiceIds.has(s.ServiceID));
  const entries = [];
  for (const s of services) {
    for (const o of s.OccuranceList || []) {
      entries.push({ name: s.Name, day: o.Day, time: o.Time });
    }
  }
  return entries;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const download = searchParams.get("download") === "1";

  const db = await readDB();
  const { error } = requireSelfOrParentOrManagement(req, db, userId);
  if (error) return error;

  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!["Student", "Teacher", "Staff"].includes(user.UserType)) {
    return NextResponse.json({ error: "Schedule image only available for Student/Teacher/Staff." }, { status: 400 });
  }

  let role = "student";
  if (user.UserType === "Teacher") role = "teacherRole";
  if (user.UserType === "Staff") role = "staff";
  const entity = {
    name: user.Name,
    role,
    timezone: normalizeTimezone(user.Timezone),
    // dcp1-app students can be enrolled across multiple unrelated Services,
    // unlike p26's one-class-per-student model — no single "class name" to
    // show, so this stays blank for Student. Teacher/Staff instead show
    // their Batch/Department in the same template slot.
    className: user.UserType === "Teacher" ? user.Batch || "" : user.UserType === "Staff" ? user.Department || "" : "",
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

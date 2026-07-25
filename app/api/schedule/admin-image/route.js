import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawAdminSchedule } from "@/lib/scheduleImage";
import { requireManagement } from "@/lib/authz";

// Flattens every Service's OccuranceList into one flat list — the whole
// week's recurring pattern across every service at once, not any one
// person's. See drawAdminSchedule (lib/scheduleImage.js) for how same-slot
// conflicts (two occurrences sharing a day+time) are rendered without
// overlapping.
function buildAllEntries(db) {
  const entries = [];
  // Same rule as the Schedule tab's List/Calendar views (see SchedulePool
  // in app/dashboard/management/page.js) — a Service nobody's enrolled in
  // isn't a real class, so it shouldn't appear on the weekly image either.
  const enrolledServiceIds = new Set(db.enrollments.map((e) => e.ServiceID));
  for (const s of db.services) {
    if (!enrolledServiceIds.has(s.ServiceID)) continue;
    for (const o of s.OccuranceList || []) {
      entries.push({ serviceName: s.Name, day: o.Day, time: o.Time, duration: o.Duration, facilitator: o.Facilitator });
    }
  }
  return entries;
}

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";

  const db = await readDB();
  const entries = buildAllEntries(db);
  const buffer = await drawAdminSchedule(entries);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="DC_Admin_Weekly_Schedule.png"`,
      "Cache-Control": "no-store",
    },
  });
}

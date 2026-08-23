import { NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { readDB } from "@/lib/db";
import { drawAdminSchedule } from "@/lib/scheduleImage";
import { requireManagement } from "@/lib/authz";
import { normalizeGroup } from "@/lib/scheduleGen";
import { batchesOf } from "@/lib/billing";

// Flattens every Service's Batches' OccuranceList into one flat list — the
// whole week's recurring pattern across every service/batch at once, not
// any one person's. A Staff-role Service (Role/Department, no Batches — see
// applyStaffRoleFields in app/api/services/route.js) contributes its
// OccuranceList directly via the same pseudo-batch batchesOf already
// returns nothing for, so it's handled as a fallback below. See
// drawAdminSchedule (lib/scheduleImage.js) for how same-slot conflicts (two
// occurrences sharing a day+time) are rendered without overlapping.
function buildAllEntries(db) {
  const entries = [];
  // Same rule as the Schedule tab's List/Calendar views (see SchedulePool
  // in app/dashboard/management/page.js) — a Batch nobody's enrolled in
  // isn't a real class, so it shouldn't appear on the weekly image either.
  const enrolledBatchKeys = new Set(db.enrollments.map((e) => `${e.ServiceID}::${e.BatchID || ""}`));
  for (const s of db.services) {
    const batches = batchesOf(s);
    const effective = batches.length > 0 ? batches : [{ BatchID: "", OccuranceList: s.OccuranceList || [] }];
    for (const b of effective) {
      if (!enrolledBatchKeys.has(`${s.ServiceID}::${b.BatchID || ""}`)) continue;
      for (const o of b.OccuranceList || []) {
        // An occurrence with no Day/Time set yet (e.g. a resource-only
        // service pending a real schedule) has nothing to draw — skip it.
        if (!o.Day || !o.Time) continue;
        entries.push({ serviceName: s.Name, day: o.Day, time: o.Time, duration: o.Duration, facilitator: o.Facilitator, group: normalizeGroup(s.Group) });
      }
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

  // Same fix as app/api/schedule/image/route.js: was "no-store", forcing a
  // full canvas re-render + full re-transfer of this PNG on every view of
  // the Schedule tab's admin image, even when the underlying schedule
  // hadn't changed since the last view. ETag over exactly the rendered
  // inputs lets the browser revalidate cheaply (304) instead.
  const etag = `"${crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex").slice(0, 32)}"`;
  if (!download && req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { "Cache-Control": "private, max-age=0, must-revalidate", ETag: etag } });
  }

  const pngBuffer = await drawAdminSchedule(entries);

  // Same WebP re-encode as app/api/schedule/image/route.js — download
  // stays PNG for compatibility, inline view gets WebP (quality 90,
  // visually indistinguishable for this kind of rendered chart, ~85%
  // smaller transfer).
  if (download) {
    return new NextResponse(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="DC_Admin_Weekly_Schedule.png"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: etag,
      },
    });
  }
  const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer();
  return new NextResponse(webpBuffer, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": `inline; filename="DC_Admin_Weekly_Schedule.webp"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      ETag: etag,
    },
  });
}

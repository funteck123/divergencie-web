import { NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { readDB } from "@/lib/db";
import { drawAdminSchedule, drawSchedule, SCHEDULE_IMAGE_STYLE } from "@/lib/scheduleImage";
import { requireManagement } from "@/lib/authz";
import { normalizeGroup } from "@/lib/scheduleGen";
import { todayString } from "@/lib/enrollmentDates";
import { buildBatchPicture, buildScheduleEntries } from "@/lib/adminScheduleEntries";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";
  // TKT-0345: ?batch=B8 draws only that batch, every subject it attends.
  const batch = (searchParams.get("batch") || "").trim().slice(0, 40);

  const db = await readDB();
  // A batch picture is drawn like a student's own schedule, in one timezone that the picture's header names (?tz= overrides).
  const batchPicture = batch ? buildBatchPicture(db, todayString(), batch, searchParams.get("tz") || "") : null;
  const entries = batchPicture ? batchPicture.entries : buildScheduleEntries(db, todayString(), batch).map((e) => ({ ...e, group: normalizeGroup(e.group) }));

  // Same fix as app/api/schedule/image/route.js: was "no-store", forcing a
  // full canvas re-render + full re-transfer of this PNG on every view of
  // the Schedule tab's admin image, even when the underlying schedule
  // hadn't changed since the last view. ETag over exactly the rendered
  // inputs lets the browser revalidate cheaply (304) instead.
  const etag = `"${crypto.createHash("sha256").update(JSON.stringify({ style: SCHEDULE_IMAGE_STYLE, entries, batch, entity: batchPicture?.entity })).digest("hex").slice(0, 32)}"`;
  if (!download && req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { "Cache-Control": "private, max-age=0, must-revalidate", ETag: etag } });
  }

  const pngBuffer = batchPicture ? await drawSchedule(batchPicture.entity, entries) : await drawAdminSchedule(entries);

  // Same WebP re-encode as app/api/schedule/image/route.js — download
  // stays PNG for compatibility, inline view gets WebP (quality 90,
  // visually indistinguishable for this kind of rendered chart, ~85%
  // smaller transfer).
  if (download) {
    return new NextResponse(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${batch ? `DC_Batch_${batch.replace(/\W+/g, "_")}_Schedule` : "DC_Admin_Weekly_Schedule"}.png"`,
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

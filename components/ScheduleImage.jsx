"use client";

import Image from "next/image";

// Renders the p26-style schedule PNG (generated server-side from the user's
// live enrollments) and lets it be downloaded. `thumbnail` shrinks it for use
// in a table cell (e.g. Management's Accounts tab). The PNG's real aspect
// ratio isn't known ahead of render (it depends on how many days/slots that
// user has scheduled), so this uses `fill` + `object-fit: contain` inside a
// sized wrapper rather than guessing a fixed width/height -- never crops or
// distorts the image, whatever its real shape turns out to be. The one real
// behavior change from the plain <img> this replaces: the full (non-
// thumbnail) view is now capped at 700px tall instead of growing the page
// without limit for an unusually tall schedule; letterboxed, not cropped.
// `unoptimized` is required: /api/schedule/image needs the caller's own
// session cookie (requireSelfOrParentOrManagement), but Next's built-in
// optimizer fetches the src server-side without forwarding cookies, so an
// optimized fetch 401s and the image never loads (confirmed live: 0x0
// naturalWidth/Height with complete:true, the failed-load fingerprint).
export default function ScheduleImage({ userId, userName, thumbnail = false }) {
  const viewSrc = `/api/schedule/image?userId=${userId}`;
  const downloadSrc = `/api/schedule/image?userId=${userId}&download=1`;

  return (
    <div className={thumbnail ? "" : "space-y-3"}>
      <div
        style={
          thumbnail
            ? { position: "relative", width: 120, height: 90, borderRadius: 4, border: "1px solid var(--border)" }
            : { position: "relative", width: "100%", height: 700, borderRadius: 8, border: "1px solid var(--border)" }
        }
      >
        <Image src={viewSrc} alt={`${userName}'s schedule`} fill style={{ objectFit: "contain" }} unoptimized />
      </div>
      <div>
        <a className="btn-ghost" href={downloadSrc} download={`DC_Schedule_${userName}.png`}>
          Download PNG
        </a>
      </div>
    </div>
  );
}

"use client";

// Renders the p26-style schedule PNG (generated server-side from the user's
// live enrollments) and lets it be downloaded. `thumbnail` shrinks it for use
// in a table cell (e.g. Management's Accounts tab).
export default function ScheduleImage({ userId, userName, thumbnail = false }) {
  const viewSrc = `/api/schedule/image?userId=${userId}`;
  const downloadSrc = `/api/schedule/image?userId=${userId}&download=1`;

  return (
    <div className={thumbnail ? "" : "space-y-3"}>
      <img
        src={viewSrc}
        alt={`${userName}'s schedule`}
        style={thumbnail ? { width: 120, borderRadius: 4, border: "1px solid var(--border)" } : { maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
      />
      <div>
        <a className="btn-ghost" href={downloadSrc} download={`DC_Schedule_${userName}.png`}>
          Download PNG
        </a>
      </div>
    </div>
  );
}

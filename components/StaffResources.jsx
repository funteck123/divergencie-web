"use client";

// Staff-only "Resources" card — Work Folder (Google Drive) and Timesheet are
// attributes of the Staff account itself (see applyStaffExtras in
// app/api/users/route.js), not tied to any Service/enrollment, so this
// intentionally skips the per-Service ResourcesSection (Recordings/
// Syllabus/Worksheets/Google Classroom don't apply to Staff).
const LINKS = [
  { label: "Work Folder", field: "WorkFolderURL" },
  { label: "Timesheet", field: "TimesheetURL" },
];

export default function StaffResources({ user }) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Resources</h2>
      <div className="flex gap-2 flex-wrap">
        {LINKS.map(({ label, field }) => {
          const url = user?.[field];
          return url ? (
            <a key={field} className="btn-ghost" href={url} target="_blank" rel="noreferrer">
              {label}
            </a>
          ) : (
            <span
              key={field}
              className="btn-ghost"
              style={{ opacity: 0.5, cursor: "not-allowed" }}
              title="Not set yet — ask Management."
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

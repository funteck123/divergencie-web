"use client";

import { timezoneLabel } from "@/lib/timezones";

// Fields that only apply to Teacher/Staff/Ambassador accounts — mirrors
// ROLE_ELIGIBLE in api/users/route.js (duplicated since that module can't
// be imported into a "use client" component).
const ROLE_ELIGIBLE = ["Teacher", "Staff", "Ambassador"];

// Read-only summary of the logged-in account's own record. `user` should be
// the full record from /api/me (has Timezone/Role/Department/Currency/
// Status), not the lightweight {UserID, UserType, Name} DashboardShell
// keeps in localStorage.
export default function MyInfo({ user, linkedChildren }) {
  const rows = [
    ["Account ID", user.UserID],
    ["Name", user.Name],
    ["Type", user.UserType],
    ["Status", user.Status],
  ];
  if (["Student", "Teacher", "Staff", "Ambassador"].includes(user.UserType)) {
    rows.push(["Timezone", timezoneLabel(user.Timezone)]);
  }
  if (user.UserType === "Student") rows.push(["Course", user.Course || "—"]);
  if (["Student", "Teacher"].includes(user.UserType)) rows.push(["Batch", user.Batch || "—"]);
  if (ROLE_ELIGIBLE.includes(user.UserType)) {
    rows.push(["Role", user.Role || "—"]);
    rows.push(["Department", user.Department || "—"]);
    rows.push(["Passport / IC Number", user.PassportNumber || "—"]);
    rows.push(["WhatsApp Number", user.WhatsAppNumber || "—"]);
    rows.push(["Email", user.Email || "—"]);
  }
  rows.push(["Currency", user.Currency || "INR"]);
  if (user.UserType === "Student") {
    rows.push(["WhatsApp Number", user.WhatsAppNumber || "—"]);
    rows.push(["Parent WhatsApp Number", user.ParentWhatsAppNumber || "—"]);
    rows.push(["Email", user.Email || "—"]);
    rows.push(["School", user.School || "—"]);
    rows.push(["Location", user.Location || "—"]);
    // Onboarding tracker (GroupSent/GCRSent/ScheduleSent) is a private
    // Management checklist, not shown here — Timesheet/Progress Tracker are
    // for the student's own use, so they do belong on this card.
    rows.push([
      "Timesheet",
      user.TimesheetURL ? (
        <a key="timesheet" href={user.TimesheetURL} target="_blank" rel="noreferrer">
          {user.TimesheetURL}
        </a>
      ) : (
        "—"
      ),
    ]);
    rows.push([
      "Progress Tracker",
      user.ProgressTrackerURL ? (
        <a key="progress" href={user.ProgressTrackerURL} target="_blank" rel="noreferrer">
          {user.ProgressTrackerURL}
        </a>
      ) : (
        "—"
      ),
    ]);
  }
  if (user.UserType === "Staff") {
    rows.push([
      "Work Folder",
      user.WorkFolderURL ? (
        <a key="workfolder" href={user.WorkFolderURL} target="_blank" rel="noreferrer">
          {user.WorkFolderURL}
        </a>
      ) : (
        "—"
      ),
    ]);
    rows.push([
      "Timesheet",
      user.TimesheetURL ? (
        <a key="timesheet" href={user.TimesheetURL} target="_blank" rel="noreferrer">
          {user.TimesheetURL}
        </a>
      ) : (
        "—"
      ),
    ]);
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">My Info</h2>
      <div className="overflow-x-auto">
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ color: "var(--muted)", width: 160 }}>{label}</td>
              <td>{value ?? "—"}</td>
            </tr>
          ))}
          {linkedChildren && (
            <tr>
              <td style={{ color: "var(--muted)" }}>Linked children</td>
              <td>
                {linkedChildren.length > 0
                  ? linkedChildren.map((c) => `${c.Name} (${c.UserID})`).join(", ")
                  : "—"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

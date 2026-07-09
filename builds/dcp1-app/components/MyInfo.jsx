"use client";

import { timezoneLabel } from "@/lib/timezones";

// Read-only summary of the logged-in account's own record. `user` should be
// the full record from /api/me (has Timezone/StaffRole/Status), not the
// lightweight {UserID, UserType, Name} DashboardShell keeps in localStorage.
export default function MyInfo({ user, linkedChildren }) {
  const rows = [
    ["Account ID", user.UserID],
    ["Name", user.Name],
    ["Type", user.UserType],
    ["Status", user.Status],
  ];
  if (["Student", "Teacher", "Staff"].includes(user.UserType)) {
    rows.push(["Timezone", timezoneLabel(user.Timezone)]);
  }
  if (user.UserType === "Student") rows.push(["Course", user.Course || "—"]);
  if (["Student", "Teacher"].includes(user.UserType)) rows.push(["Batch", user.Batch || "—"]);
  if (user.UserType === "Staff") {
    rows.push(["Role", user.StaffRole || "—"]);
    rows.push(["Department", user.Department || "—"]);
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">My Info</h2>
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
  );
}

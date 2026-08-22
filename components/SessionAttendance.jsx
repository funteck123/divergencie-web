"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { MiniAttendanceForm } from "@/components/ScheduleCalendar";
import { formatDateTime } from "@/lib/formatDate";

// TKT-0037: shown when a session's chip is expanded (via ScheduleCalendar's
// `renderExpanded` prop). Fetches GET /api/attendance?scheduleItemId=X on
// demand — {roster, attendanceItems} for just this one session, rather than
// requiring every dashboard's bulk /api/me payload to carry every co-
// enrolled person's attendance for every session up front.
//
// Two modes:
//   - Teacher/Student (isManagement=false): self always loggable; a
//     Teacher may additionally log every co-enrolled Student, a Student may
//     additionally log the co-enrolled Teacher (never Student-logs-Student).
//     No "mark as correct" control — that's Management's call.
//   - Management (isManagement=true): read-only roster/history, plus "Mark
//     correct" on any non-accepted record once 2+ exist for the same
//     subject — flips AcceptedForBilling, never deletes either record.
export default function SessionAttendance({ scheduleId, duration, viewerUserId, viewerType, isManagement = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function load() {
    try {
      const d = await api(`/api/attendance?scheduleItemId=${scheduleId}`);
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  async function log(subjectUserId, status, loggedDuration) {
    setError("");
    try {
      await api("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ scheduleItemId: scheduleId, userId: subjectUserId, status, loggedDuration }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function markCorrect(attendanceId) {
    setError("");
    try {
      await api("/api/attendance", { method: "PATCH", body: JSON.stringify({ attendanceId }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  // TKT-0095: no record could be edited after submission at all, not even
  // by Management -- only who's accepted for billing could change. This
  // reuses the same PATCH, now with real status/loggedDuration changes;
  // editing also accepts the record for billing, same as markCorrect.
  async function saveEdit(attendanceId, status, loggedDuration) {
    setError("");
    try {
      await api("/api/attendance", { method: "PATCH", body: JSON.stringify({ attendanceId, status, loggedDuration }) });
      setEditingId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!data) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  const { roster, attendanceItems } = data;

  function canLog(targetUserId, targetType) {
    if (isManagement) return false;
    if (targetUserId === viewerUserId) return true;
    if (viewerType === "Teacher" && targetType === "Student") return true;
    if (viewerType === "Student" && targetType === "Teacher") return true;
    return false;
  }

  function nameOf(userId) {
    return roster.find((r) => r.userId === userId)?.name || userId;
  }

  return (
    <div className="space-y-2" style={{ fontSize: "0.8rem" }}>
      {/* TKT-0074: this used to be an early return that replaced the whole
          roster with just the error — one failed log() (e.g. re-marking
          someone already logged) blanked out every other person's form
          too, in a session with several people to mark. Now it's an inline
          banner, so the rest of the roster stays usable. */}
      {error && (
        <p style={{ color: "var(--bad)" }}>
          {error}{" "}
          <button className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      )}
      {roster.length === 0 && <p style={{ color: "var(--muted)" }}>No one enrolled in this session.</p>}
      {roster.map((person) => {
        const records = attendanceItems.filter((a) => a.UserID === person.userId);
        const alreadyLoggedByMe = records.some((a) => a.LoggedBy === viewerUserId);
        const hasConflict = records.length > 1 && records.some((a, i) => records.some((b, j) => i !== j && (a.Status !== b.Status || Number(a.LoggedDuration) !== Number(b.LoggedDuration))));
        return (
          <div key={person.userId} className="p-2" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{person.name}</span>
              <span style={{ color: "var(--muted)" }}>({person.userType})</span>
              {hasConflict && <span className="badge badge-pending">⚠ conflict</span>}
            </div>
            {records.length === 0 && <p style={{ color: "var(--muted)" }}>Not logged yet.</p>}
            {records.map((r) => (
              <div key={r.AttendanceID} className="mb-1">
                <div className="flex items-center gap-2">
                  <span className={`badge badge-${r.Status === "Present" ? "good" : r.Status === "Late" ? "pending" : "bad"}`}>{r.Status}</span>
                  <span>{r.LoggedDuration}h</span>
                  <span style={{ color: "var(--muted)" }}>
                    by {r.LoggedBy === person.userId ? "self" : nameOf(r.LoggedBy)}
                    {r.AcceptedForBilling === false ? ", not used for billing" : ""}
                  </span>
                  {/* TKT-0107: LoggedAt existed on the record already, never shown here. */}
                  {r.LoggedAt && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {formatDateTime(r.LoggedAt)}
                    </span>
                  )}
                  {isManagement && r.AcceptedForBilling === false && (
                    <button className="btn-ghost" onClick={() => markCorrect(r.AttendanceID)}>
                      Mark correct
                    </button>
                  )}
                  {isManagement && editingId !== r.AttendanceID && (
                    <button className="btn-ghost" onClick={() => setEditingId(r.AttendanceID)}>
                      Edit
                    </button>
                  )}
                </div>
                {isManagement && editingId === r.AttendanceID && (
                  <MiniAttendanceForm
                    defaultHrs={r.LoggedDuration}
                    onSubmit={(status, hrs) => saveEdit(r.AttendanceID, status, hrs)}
                  />
                )}
              </div>
            ))}
            {canLog(person.userId, person.userType) && !alreadyLoggedByMe && (
              <MiniAttendanceForm defaultHrs={duration} onSubmit={(status, hrs) => log(person.userId, status, hrs)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

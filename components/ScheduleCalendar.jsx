"use client";

import { useMemo, useState } from "react";
import { GROUP_COLORS, groupGradient, normalizeGroup } from "@/lib/client";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Month-grid calendar for a schedule. Each cell lists that day's sessions as
// chips; an unlogged session's chip expands into an inline attendance form
// (unless readOnly, e.g. the Parent portal viewing a child's schedule).
// Navigation is unbounded in both directions — months beyond the schedule's
// generation horizon (~1 month ahead) just render empty, same as any month
// with no sessions.
// TKT-0037: `renderExpanded(scheduleId)`, if passed, replaces the default
// self-only MiniAttendanceForm entirely — used by Teacher/Student
// dashboards (SessionAttendance: full roster, log self + the allowed other
// party) and the admin Schedule tab (read-only roster + conflict
// resolution). Every OTHER caller (Staff/Ambassador/Parent dashboards)
// doesn't pass it and keeps the exact original self-only behavior,
// unaffected by this ticket's changes.
export default function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance, readOnly = false, colorByGroup = false, portalColor, renderExpanded }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expandedId, setExpandedId] = useState(null);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const s of scheduleItems) {
      (map[s.Date] ||= []).push(s);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.Time.localeCompare(b.Time));
    }
    return map;
  }, [scheduleItems]);

  // Sequential number of a session within its recurring Occurrence (1st,
  // 2nd, ...), so e.g. two Tuesday classes in a row read as "#3" and "#4".
  // One-off (non-recurring) slots have no OccuranceID and get no number.
  const occNumberByScheduleId = useMemo(() => {
    const byOcc = {};
    for (const s of scheduleItems) {
      if (!s.OccuranceID) continue;
      (byOcc[s.OccuranceID] ||= []).push(s);
    }
    const map = {};
    for (const list of Object.values(byOcc)) {
      const ordered = [...list].sort((a, b) => (a.Date + a.Time).localeCompare(b.Date + b.Time));
      ordered.forEach((s, i) => {
        map[s.ScheduleID] = i + 1;
      });
    }
    return map;
  }, [scheduleItems]);

  // Prefer the AcceptedForBilling record when more than one exists for this
  // session (TKT-0037) — a more meaningful glance-level status than
  // whichever record happens to be first in the array.
  function attendanceFor(scheduleId) {
    const records = attendanceItems.filter((a) => a.ScheduleItemID === scheduleId);
    return records.find((a) => a.AcceptedForBilling !== false) || records[0];
  }

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

  function goPrev() {
    setExpandedId(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function goNext() {
    setExpandedId(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }
  function goToday() {
    setExpandedId(null);
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={goPrev}>‹</button>
          <button className="btn-ghost" onClick={goToday}>Today</button>
          <button className="btn-ghost" onClick={goNext}>›</button>
        </div>
        <h3 className="font-semibold">{MONTH_LABELS[month]} {year}</h3>
        <div style={{ width: 132 }} />
      </div>

      {colorByGroup && (
        <div className="flex gap-3 flex-wrap mb-3 text-xs" style={{ color: "var(--muted)" }}>
          {Object.entries(GROUP_COLORS).map(([group, color]) => (
            <div key={group} className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: color }} />
              {group}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-xs text-center" style={{ color: "var(--muted)" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const dateStr = inMonth ? fmtDate(year, month, dayNum) : null;
          const sessions = inMonth ? itemsByDate[dateStr] || [] : [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              style={{
                minHeight: 84,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0.35rem",
                background: inMonth ? "var(--panel-2)" : "transparent",
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <div
                className="text-xs mb-1"
                style={{ color: isToday ? "var(--accent-2)" : "var(--muted)", fontWeight: isToday ? 700 : 400 }}
              >
                {inMonth ? dayNum : ""}
              </div>
              <div className="space-y-1">
                {sessions.map((s) => {
                  const att = attendanceFor(s.ScheduleID);
                  const kind = !att ? "info" : att.Status === "Present" ? "good" : att.Status === "Late" ? "pending" : "bad";
                  // With renderExpanded, the chip is always reopenable (view
                  // roster/resolve conflicts even after attendance exists) —
                  // without it, the original self-only rule (only clickable
                  // until logged) is unchanged.
                  const clickable = renderExpanded ? true : !readOnly && !att;
                  const normalizedGroup = normalizeGroup(s.ServiceGroup);
                  const groupStyle = colorByGroup
                    ? { background: groupGradient(normalizedGroup), color: "#fff" }
                    : portalColor
                    ? { background: portalColor, color: "#fff" }
                    : {};
                  return (
                    <div key={s.ScheduleID}>
                      <button
                        type="button"
                        className={colorByGroup || portalColor ? "badge" : `badge badge-${kind}`}
                        style={{ display: "block", width: "100%", textAlign: "left", cursor: clickable ? "pointer" : "default", ...groupStyle }}
                        onClick={() => clickable && setExpandedId(expandedId === s.ScheduleID ? null : s.ScheduleID)}
                        title={`${s.ServiceName} — ${normalizedGroup.join(" + ")}`}
                      >
                        {s.Time} {s.ServiceName}
                        {occNumberByScheduleId[s.ScheduleID] ? ` #${occNumberByScheduleId[s.ScheduleID]}` : ""}
                        {s.Facilitator ? ` · ${s.Facilitator}` : ""}
                        {att ? ` · ${att.Status}` : ""}
                      </button>
                      {expandedId === s.ScheduleID && clickable && (
                        <div className="mt-1">
                          {renderExpanded ? (
                            renderExpanded(s.ScheduleID, s)
                          ) : (
                            <MiniAttendanceForm
                              defaultHrs={s.Duration}
                              onSubmit={(status, hrs) => {
                                onLogAttendance(s.ScheduleID, status, hrs);
                                setExpandedId(null);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniAttendanceForm({ defaultHrs, onSubmit }) {
  const [status, setStatus] = useState("Present");
  const [hrs, setHrs] = useState(defaultHrs);
  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(status, hrs);
      }}
    >
      <select className="field" style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option>Present</option>
        <option>Absent</option>
        <option>Late</option>
      </select>
      <div className="flex gap-1">
        <input
          className="field"
          style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", width: 50 }}
          type="number"
          step="0.5"
          value={hrs}
          onChange={(e) => setHrs(e.target.value)}
        />
        <button className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }} type="submit">
          Log
        </button>
      </div>
    </form>
  );
}

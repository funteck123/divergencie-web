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
// Cells past this many sessions show a "+N more" pill instead of growing —
// paired with CELL_MAX_HEIGHT below so no cell can blow out the week row's
// height regardless of how many sessions land on one day.
const VISIBLE_SESSIONS_PER_CELL = 3;
const CELL_MAX_HEIGHT = 144;

export default function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance, readOnly = false, colorByGroup = false, portalColor, renderExpanded }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expandedId, setExpandedId] = useState(null);
  // Date string of the day currently shown in the "full day" popover, or
  // null — opened by clicking a cell with more sessions than fit in it.
  const [dayModalDate, setDayModalDate] = useState(null);

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

  // Shared chip renderer — used both for a cell's own (capped) list and for
  // the full-day popover, so the click-to-expand-attendance behavior is
  // identical in both places. `truncate` clips the label to one line (cell
  // context, where a long ServiceName wrapping across several lines could
  // by itself blow past the cell's own height and hide the "+N more" pill
  // below it) — the popover passes false so the full label is readable.
  function renderSessionChip(s, truncate = false) {
    const att = attendanceFor(s.ScheduleID);
    const kind = !att ? "info" : att.Status === "Present" ? "good" : att.Status === "Late" ? "pending" : "bad";
    // With renderExpanded, the chip is always reopenable (view roster/
    // resolve conflicts even after attendance exists) — without it, the
    // original self-only rule (only clickable until logged) is unchanged.
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
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            cursor: clickable ? "pointer" : "default",
            ...(truncate ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : {}),
            ...groupStyle,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (clickable) setExpandedId(expandedId === s.ScheduleID ? null : s.ScheduleID);
          }}
          title={`${s.ServiceName} — ${normalizedGroup.join(" + ")}`}
        >
          {s.Time} {s.ServiceName}
          {occNumberByScheduleId[s.ScheduleID] ? ` #${occNumberByScheduleId[s.ScheduleID]}` : ""}
          {s.Facilitator ? ` · ${s.Facilitator}` : ""}
          {att ? ` · ${att.Status}` : ""}
        </button>
        {expandedId === s.ScheduleID && clickable && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
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

      {/* Fixed-height scroll region for the week grid — keeps the nav/legend
          above it always visible regardless of how many weeks the month
          spans, instead of the whole card growing the page. */}
      <div className="grid grid-cols-7 gap-1" style={{ maxHeight: 560, overflowY: "auto", paddingRight: 2 }}>
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const dateStr = inMonth ? fmtDate(year, month, dayNum) : null;
          const sessions = inMonth ? itemsByDate[dateStr] || [] : [];
          const isToday = dateStr === todayStr;

          const overflowCount = sessions.length - VISIBLE_SESSIONS_PER_CELL;
          const hasOverflow = overflowCount > 0;
          const visibleSessions = hasOverflow ? sessions.slice(0, VISIBLE_SESSIONS_PER_CELL) : sessions;

          return (
            <div
              key={i}
              onClick={() => inMonth && sessions.length > 0 && setDayModalDate(dateStr)}
              style={{
                maxHeight: CELL_MAX_HEIGHT,
                overflow: "hidden",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0.35rem",
                background: inMonth ? "var(--panel-2)" : "transparent",
                opacity: inMonth ? 1 : 0.35,
                cursor: inMonth && sessions.length > 0 ? "pointer" : "default",
              }}
            >
              <div
                className="text-xs mb-1"
                style={{ color: isToday ? "var(--accent-2)" : "var(--muted)", fontWeight: isToday ? 700 : 400 }}
              >
                {inMonth ? dayNum : ""}
              </div>
              <div className="space-y-1">
                {visibleSessions.map((s) => renderSessionChip(s, true))}
                {hasOverflow && (
                  <button
                    type="button"
                    className="badge"
                    style={{ display: "block", width: "100%", textAlign: "left" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayModalDate(dateStr);
                    }}
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dayModalDate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setDayModalDate(null)}
        >
          <div
            className="card"
            style={{ width: "min(480px, 90vw)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{dayModalDate}</h3>
              <button className="btn-ghost" onClick={() => setDayModalDate(null)}>Close</button>
            </div>
            <div className="space-y-1">
              {(itemsByDate[dayModalDate] || []).map((s) => renderSessionChip(s, false))}
            </div>
          </div>
        </div>
      )}
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
      <label style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>
        Status
        <select className="field" style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", display: "block", width: "100%" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>Present</option>
          <option>Absent</option>
          <option>Late</option>
        </select>
      </label>
      <div className="flex gap-1 items-end">
        <label style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
          Hours
          <input
            className="field"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", width: 50, display: "block" }}
            type="number"
            step="0.5"
            value={hrs}
            onChange={(e) => setHrs(e.target.value)}
          />
        </label>
        <button className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }} type="submit">
          Log
        </button>
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// Month-grid or single-week calendar for a schedule. Each cell lists that
// day's sessions as chips; an unlogged session's chip expands into an inline
// attendance form (unless readOnly, e.g. the Parent portal viewing a child's
// schedule). Forward navigation is capped at the same rolling window the
// schedule is generated for (~1 month ahead) — past is unbounded since
// history is never deleted.
export default function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance, mode = "month", readOnly = false }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
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

  function attendanceFor(scheduleId) {
    return attendanceItems.find((a) => a.ScheduleItemID === scheduleId);
  }

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
  // Schedule is only ever generated ~1 month ahead — cap forward navigation
  // there so users can't page into empty future months/weeks.
  const horizonMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const horizonWeekStart = startOfWeek(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()));

  function renderSession(s) {
    const att = attendanceFor(s.ScheduleID);
    const kind = !att ? "info" : att.Status === "Present" ? "good" : att.Status === "Late" ? "pending" : "bad";
    const clickable = !readOnly && !att;
    return (
      <div key={s.ScheduleID}>
        <button
          type="button"
          className={`badge badge-${kind}`}
          style={{ display: "block", width: "100%", textAlign: "left", cursor: clickable ? "pointer" : "default" }}
          onClick={() => clickable && setExpandedId(expandedId === s.ScheduleID ? null : s.ScheduleID)}
          title={s.ServiceName}
        >
          {s.Time} {s.ServiceName}
          {occNumberByScheduleId[s.ScheduleID] ? ` #${occNumberByScheduleId[s.ScheduleID]}` : ""}
          {att ? ` · ${att.Status}` : ""}
        </button>
        {expandedId === s.ScheduleID && clickable && (
          <div className="mt-1">
            <MiniAttendanceForm
              defaultHrs={s.Duration}
              onSubmit={(status, hrs) => {
                onLogAttendance(s.ScheduleID, status, hrs);
                setExpandedId(null);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (mode === "week") {
    const atHorizon = weekStart >= horizonWeekStart;
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = days[6];
    const label =
      weekStart.getMonth() === weekEnd.getMonth()
        ? `${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
        : `${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_LABELS[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setExpandedId(null); setWeekStart((w) => addDays(w, -7)); }}>‹</button>
            <button className="btn-ghost" onClick={() => { setExpandedId(null); setWeekStart(startOfWeek(today)); }}>Today</button>
            <button className="btn-ghost" disabled={atHorizon} style={atHorizon ? { opacity: 0.4, cursor: "default" } : undefined} onClick={() => { if (!atHorizon) { setExpandedId(null); setWeekStart((w) => addDays(w, 7)); } }}>›</button>
          </div>
          <h3 className="font-semibold">{label}</h3>
          <div style={{ width: 132 }} />
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const dateStr = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
            const sessions = itemsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            return (
              <div
                key={dateStr}
                style={{
                  minHeight: 140,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0.35rem",
                  background: "var(--panel-2)",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: isToday ? "var(--accent-2)" : "var(--muted)", fontWeight: isToday ? 700 : 400 }}
                >
                  {DAY_LABELS[i]} {d.getDate()}
                </div>
                <div className="space-y-1">
                  {sessions.map(renderSession)}
                  {sessions.length === 0 && <div className="text-xs" style={{ color: "var(--muted)" }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const atHorizon = year > horizonMonthDate.getFullYear() || (year === horizonMonthDate.getFullYear() && month >= horizonMonthDate.getMonth());

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
    if (atHorizon) return;
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
          <button className="btn-ghost" disabled={atHorizon} style={atHorizon ? { opacity: 0.4, cursor: "default" } : undefined} onClick={goNext}>›</button>
        </div>
        <h3 className="font-semibold">{MONTH_LABELS[month]} {year}</h3>
        <div style={{ width: 132 }} />
      </div>

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
              <div className="space-y-1">{sessions.map(renderSession)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniAttendanceForm({ defaultHrs, onSubmit }) {
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

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

// Month-grid calendar for a schedule. Each cell lists that day's sessions as
// chips; an unlogged session's chip expands into an inline attendance form.
export default function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance }) {
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

  function attendanceFor(scheduleId) {
    return attendanceItems.find((a) => a.ScheduleItemID === scheduleId);
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
                  return (
                    <div key={s.ScheduleID}>
                      <button
                        type="button"
                        className={`badge badge-${kind}`}
                        style={{ display: "block", width: "100%", textAlign: "left", cursor: att ? "default" : "pointer" }}
                        onClick={() => !att && setExpandedId(expandedId === s.ScheduleID ? null : s.ScheduleID)}
                        title={s.ServiceName}
                      >
                        {s.Time} {s.ServiceName}
                        {occNumberByScheduleId[s.ScheduleID] ? ` #${occNumberByScheduleId[s.ScheduleID]}` : ""}
                        {att ? ` · ${att.Status}` : ""}
                      </button>
                      {expandedId === s.ScheduleID && !att && (
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
                })}
              </div>
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

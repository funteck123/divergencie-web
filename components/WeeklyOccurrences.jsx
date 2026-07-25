"use client";

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The recurring weekly pattern of every enrolled service's occurrences —
// day + time only, no specific dates. Distinct from the Calendar view, which
// shows actual dated sessions.
export default function WeeklyOccurrences({ services }) {
  const byDay = {};
  for (const s of services) {
    const label = s.Code ? `${s.Code} · ${s.Name}` : s.Name;
    for (const o of s._myOccurrences || []) {
      (byDay[o.Day] ||= []).push({ ...o, serviceLabel: label });
    }
  }
  for (const list of Object.values(byDay)) {
    list.sort((a, b) => a.Time.localeCompare(b.Time));
  }
  const hasAny = DAY_ORDER.some((d) => (byDay[d] || []).length > 0);

  if (!hasAny) {
    return <p style={{ color: "var(--muted)" }}>No recurring occurrences yet.</p>;
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_ORDER.map((day) => (
        <div
          key={day}
          style={{
            minHeight: 90,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.35rem",
            background: "var(--panel-2)",
          }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
            {day.slice(0, 3)}
          </div>
          <div className="space-y-1">
            {(byDay[day] || []).map((o, i) => (
              <span key={i} className="badge badge-info" style={{ display: "block", textAlign: "left" }}>
                {o.Time} {o.serviceLabel} ({o.Duration}h){o.Facilitator ? ` · ${o.Facilitator}` : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

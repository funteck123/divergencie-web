"use client";

import { useMemo, useState } from "react";
import { todayDateStr } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";
import { Button } from "@/ui2/components/Button";
import { TextInput } from "@/ui2/components/Field";
import type { RescheduleRequest, ScheduleItem } from "@/ui2/queries/types";
import { RescheduleCell } from "./RescheduleCell";
import { dayTimeline } from "./scheduleLogic";
import "./schedule.css";

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * One row per instructor across one day. A session is a bar placed by its start and length; two sessions of the same instructor
 * that overlap are drawn red, and each one gets a Resolve action (move the session) under the chart. Times are in India time.
 */
export function TimelineView({ items, requests }: { items: readonly ScheduleItem[]; requests: readonly RescheduleRequest[] }) {
  const [date, setDate] = useState(() => todayDateStr() as string);
  const tl = useMemo(() => dayTimeline(items, date), [items, date]);
  const span = (tl.toHour - tl.fromHour) * 60;
  const hours = Array.from({ length: tl.toHour - tl.fromHour + 1 }, (_, i) => tl.fromHour + i);
  const [resolving, setResolving] = useState<string | null>(null);

  return (
    <div className="u2-rows">
      <div className="u2-inline u2-inline--center u2-inline--wrap">
        <Button size="sm" variant="ghost" onClick={() => setDate(addDays(date, -1))}>← Previous day</Button>
        <div className="u2-minw"><TextInput type="date" aria-label="Day" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
        <Button size="sm" variant="ghost" onClick={() => setDate(addDays(date, 1))}>Next day →</Button>
        <Button size="sm" variant="ghost" onClick={() => setDate(todayDateStr() as string)}>Today</Button>
        <span className="u2-muted">{formatDate(date) as string}, India time (IST)</span>
      </div>

      {tl.rows.length === 0 ? (
        <p className="u2-muted" role="status">No sessions on this day.</p>
      ) : (
        <div className="u2-tl" role="table" aria-label={`Instructor timeline, ${date}`}>
          <div className="u2-tl__row u2-tl__row--head" role="row">
            <span role="columnheader" className="u2-tl__name">Instructor</span>
            <span role="columnheader" className="u2-tl__axis">
              {hours.map((h) => <span key={h} className="u2-tl__tick" style={{ left: `${((h - tl.fromHour) / (tl.toHour - tl.fromHour)) * 100}%` }}>{String(h).padStart(2, "0")}:00</span>)}
            </span>
          </div>
          {tl.rows.map((row) => (
            <div key={row.name} className="u2-tl__row" role="row">
              <span role="rowheader" className="u2-tl__name" title={row.name}>{row.name}</span>
              <span role="cell" className="u2-tl__lane">
                {row.bars.map((b) => (
                  <span
                    key={b.id}
                    className="u2-tl__bar"
                    data-conflict={b.conflict}
                    title={`${b.label}, ${b.time} to ${hhmm(b.end)}${b.conflict ? ", overlaps another session" : ""}`}
                    style={{ left: `${((b.start - tl.fromHour * 60) / span) * 100}%`, width: `${((b.end - b.start) / span) * 100}%` }}
                  >
                    {b.conflict ? "⚠ " : ""}{b.time} {b.label}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {tl.conflicts.length > 0 && (
        <section className="u2-errorbox" aria-label="Conflicts to resolve">
          <strong>{tl.conflicts.length} overlapping session{tl.conflicts.length === 1 ? "" : "s"} to resolve</strong>
          <div className="u2-rows">
            {tl.conflicts.map((s) => (
              <div key={s.ScheduleID} className="u2-box u2-box--inner">
                <span><strong className="u2-strong">{s.ServiceName}</strong> · {s.Facilitator} · {s.RescheduledTime || s.Time}</span>
                {resolving === s.ScheduleID ? (
                  <RescheduleCell startEditing slot={s} pending={requests.find((r) => r.ScheduleItemID === s.ScheduleID)} />
                ) : (
                  <span className="u2-rowactions"><Button size="sm" variant="primary" onClick={() => setResolving(s.ScheduleID)}>Resolve</Button></span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

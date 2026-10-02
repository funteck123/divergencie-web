"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState, type ReactNode } from "react";
import { GROUP_COLORS, groupGradient, normalizeGroup } from "@/lib/client";
import { readableText } from "@/ui2/lib/contrast";
import { normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
import { Button } from "@/ui2/components/Button";
import type { AttendanceItem, ScheduleItem } from "@/ui2/queries/types";
import { MiniAttendanceForm } from "./MiniAttendanceForm";
import { attendanceFor, occurrenceNumbers } from "./scheduleLogic";
import "@/ui2/components/ConfirmDialog.css";
import "./schedule.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const VISIBLE_PER_CELL = 3;
const fmt = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export interface ScheduleCalendarProps {
  scheduleItems: readonly ScheduleItem[];
  attendanceItems: readonly AttendanceItem[];
  /** Quick log from a chip (teacher and student calendars). */
  onLogAttendance?: (scheduleId: string, status: string, hrs: number | string) => Promise<void> | void;
  readOnly?: boolean;
  /** One colour band per account group a service is open to (the admin calendars). */
  colorByGroup?: boolean;
  /** One colour for every chip (a role's own portal colour). */
  portalColor?: string;
  /** Panel shown under a clicked chip (the full attendance panel). */
  renderExpanded?: (scheduleId: string, item: ScheduleItem) => ReactNode;
  viewerTz?: string;
}

/** Month grid. Up to three sessions per day, "+N more" opens the whole day. Chips are real buttons with a full-text label. */
export function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance, readOnly = false, colorByGroup = false, portalColor, renderExpanded, viewerTz }: ScheduleCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const s of scheduleItems) m.set(s.Date, [...(m.get(s.Date) ?? []), s]);
    for (const list of m.values()) list.sort((a, b) => a.Time.localeCompare(b.Time));
    return m;
  }, [scheduleItems]);
  const occ = useMemo(() => occurrenceNumbers(scheduleItems), [scheduleItems]);

  function chip(s: ScheduleItem, truncate: boolean) {
    const att = attendanceFor(attendanceItems, s.ScheduleID);
    const tone = !att ? "info" : att.Status === "Present" ? "good" : att.Status === "Late" ? "late" : "bad";
    const clickable = renderExpanded ? true : !readOnly && !att;
    const groups = normalizeGroup(s.ServiceGroup) as string[];
    const style = colorByGroup ? { background: groupGradient(groups) as string, color: readableText(groups.map((g) => (GROUP_COLORS as Record<string, string>)[g] ?? "#6b7280")) } : portalColor ? { background: portalColor, color: readableText([portalColor]) } : undefined;
    const label = `${s.Time} ${tzAbbrFor(s.Date, viewerTz || normalizeTimezone(s.Timezone))} ${s.ServiceName ?? ""}${occ.get(s.ScheduleID) ? ` #${occ.get(s.ScheduleID)}` : ""}${s.Facilitator ? ` · ${s.Facilitator}` : ""}${att ? ` · ${att.Status}` : ""}`;
    return (
      <div key={s.ScheduleID}>
        <button
          type="button"
          className={`u2-chip u2-chip--${style ? "solid" : tone}${truncate ? " u2-chip--cut" : ""}`}
          style={style}
          disabled={!clickable}
          title={`${s.ServiceName} — ${groups.join(" + ")}`}
          aria-expanded={clickable ? expandedId === s.ScheduleID : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (clickable) setExpandedId(expandedId === s.ScheduleID ? null : s.ScheduleID);
          }}
        >
          {label}
        </button>
        {expandedId === s.ScheduleID && clickable && (
          <div className="u2-chip__panel" onClick={(e) => e.stopPropagation()}>
            {renderExpanded ? (
              renderExpanded(s.ScheduleID, s)
            ) : (
              <MiniAttendanceForm
                defaultHrs={s.Duration}
                onSubmit={async (status, hrs) => {
                  await onLogAttendance?.(s.ScheduleID, status, hrs);
                  setExpandedId(null);
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());
  const go = (delta: number) => {
    setExpandedId(null);
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <div className="u2-cal">
      <div className="u2-cal__nav">
        <span className="u2-rowactions">
          <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => go(-1)}>‹</Button>
          <Button size="sm" variant="ghost" onClick={() => { setExpandedId(null); setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</Button>
          <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => go(1)}>›</Button>
        </span>
        <h3 className="u2-cal__title" aria-live="polite">{MONTH_LABELS[month]} {year}</h3>
      </div>
      {colorByGroup && (
        <div className="u2-cal__legend">
          {Object.entries(GROUP_COLORS as Record<string, string>).map(([g, c]) => (
            <span key={g}>
              <i style={{ background: c }} /> {g}
            </span>
          ))}
        </div>
      )}
      <div className="u2-cal__grid u2-cal__dow" aria-hidden="true">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="u2-cal__grid">
        {Array.from({ length: cells }, (_, i) => {
          const day = i - startOffset + 1;
          const inMonth = day >= 1 && day <= daysInMonth;
          const date = inMonth ? fmt(year, month, day) : "";
          const sessions = inMonth ? byDate.get(date) ?? [] : [];
          const extra = sessions.length - VISIBLE_PER_CELL;
          return (
            <div key={i} className={`u2-cal__cell${inMonth ? "" : " u2-cal__cell--out"}${date === todayStr ? " u2-cal__cell--today" : ""}`} onClick={() => inMonth && sessions.length > 0 && setDayOpen(date)}>
              <div className="u2-cal__day">{inMonth ? day : ""}</div>
              {(extra > 0 ? sessions.slice(0, VISIBLE_PER_CELL) : sessions).map((s) => chip(s, true))}
              {extra > 0 && (
                <button type="button" className="u2-chip u2-chip--info" onClick={(e) => { e.stopPropagation(); setDayOpen(date); }}>
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog.Root open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
          <Dialog.Content className="u2-portal u2-dialog" aria-describedby={undefined} style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <Dialog.Title className="u2-dialog__title">{dayOpen}</Dialog.Title>
            <div className="u2-rows">{(dayOpen ? byDate.get(dayOpen) ?? [] : []).map((s) => chip(s, false))}</div>
            <div className="u2-dialog__actions">
              <Dialog.Close asChild>
                <Button variant="ghost">Close</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

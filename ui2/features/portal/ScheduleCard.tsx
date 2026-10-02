"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDate, formatDay } from "@/lib/formatDate";
import { GROUP_COLORS } from "@/lib/client";
import { normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { CheckField } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { MiniAttendanceForm } from "@/ui2/features/schedule/MiniAttendanceForm";
import { ScheduleCalendar } from "@/ui2/features/schedule/ScheduleCalendar";
import { SessionAttendance } from "@/ui2/features/schedule/SessionAttendance";
import { apiFetch } from "@/ui2/queries/client";
import type { AttendanceItem, RescheduleRequest, ScheduleItem } from "@/ui2/queries/types";
import { Card, ScheduleImageView, WeeklyGrid } from "./Cards";
import { SuggestReschedule } from "./Controls";
import { inRange, myAttendance, type EnrolledService, type Range } from "./portalLogic";
import "./portal.css";

type View = "weekly" | "calendar" | "list" | "image";

export interface ScheduleCardProps {
  user: { UserID: string; Name: string; UserType: string; Timezone?: string };
  services: readonly EnrolledService[];
  scheduleItems: readonly ScheduleItem[];
  attendance: readonly AttendanceItem[];
  rescheduleRequests: readonly RescheduleRequest[];
  /** Which person's schedule this is (a parent looks at a child's). Defaults to the viewer. */
  subject?: { UserID: string; Name: string };
  /** Parent view: nothing can be logged, only requests to move a session. */
  readOnly?: boolean;
  /** "select": Upcoming, Last 7 days, Last 30 days, All (student, teacher). "past": a Show past box (staff, ambassador, parent). */
  rangeMode?: "select" | "past";
  /** Teachers and students log through the full attendance panel; staff and ambassadors use a quick form. */
  attendanceMode?: "panel" | "quick" | "none";
  showImage?: boolean;
  showDay?: boolean;
  /** Parent schedule times keep the session's own timezone; everyone else sees their own. */
  ownTimezone?: boolean;
  onChanged: () => void;
}

const RANGES: { value: Range; label: string }[] = [{ value: "upcoming", label: "Upcoming" }, { value: "last7", label: "Last 7 days" }, { value: "last30", label: "Last 30 days" }, { value: "all", label: "All" }];
const VIEWS: { id: View; label: string }[] = [{ id: "weekly", label: "Weekly" }, { id: "calendar", label: "Calendar" }, { id: "list", label: "List" }, { id: "image", label: "Schedule Image" }];

/** "My Schedule": weekly slots, month calendar, a list with attendance and reschedule, and the schedule image. */
export function ScheduleCard({ user, services, scheduleItems, attendance, rescheduleRequests, subject, readOnly = false, rangeMode = "select", attendanceMode = "panel", showImage = true, showDay = false, ownTimezone = true, onChanged }: ScheduleCardProps) {
  const [view, setView] = useState<View>("calendar");
  const [range, setRange] = useState<Range>("upcoming");
  const [showPast, setShowPast] = useState(false);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const who = subject ?? user;
  const viewerTz = ownTimezone ? normalizeTimezone(user.Timezone) : undefined;
  const tz = (s: ScheduleItem) => tzAbbrFor(s.Date, viewerTz ?? normalizeTimezone(s.Timezone));

  const rows = useMemo(
    () =>
      scheduleItems
        .filter((s) => (rangeMode === "select" ? inRange(s, range) : showPast || s.Date >= new Date().toISOString().slice(0, 10)))
        .filter((s) => { const n = q.trim().toLowerCase(); return !n || (s.ServiceName || "").toLowerCase().includes(n) || (s.Facilitator || "").toLowerCase().includes(n); }),
    [scheduleItems, rangeMode, range, showPast, q],
  );
  const color = (GROUP_COLORS as Record<string, string>)[user.UserType];
  const views = showImage ? VIEWS : VIEWS.filter((v) => v.id !== "image");

  async function quickLog(scheduleItemId: string, status: string, loggedDuration: number | string) {
    try {
      await apiFetch("/api/attendance", { method: "POST", body: { scheduleItemId, userId: user.UserID, status, loggedDuration } });
      toast.success("Attendance logged.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log.");
    }
  }

  const cols: Column<ScheduleItem>[] = [
    { id: "service", header: "Service", sortValue: (s) => s.ServiceName ?? "", tip: (s) => s.ServiceName, cell: (s) => s.ServiceName },
    { id: "date", header: "Date", width: 96, sortValue: (s) => s.Date + s.Time, cell: (s) => formatDate(s.Date) as string },
    ...(showDay ? ([{ id: "day", header: "Day", width: 60, cell: (s: ScheduleItem) => formatDay(s.Date) as string }] satisfies Column<ScheduleItem>[]) : []),
    { id: "time", header: "Time", width: 92, cell: (s) => `${s.Time} ${tz(s)}` },
    ...(readOnly ? [] : ([{ id: "hrs", header: "Hrs", width: 44, numeric: true, sortValue: (s: ScheduleItem) => Number(s.Duration), cell: (s: ScheduleItem) => s.Duration }] satisfies Column<ScheduleItem>[])),
    { id: "who", header: "Instructor", width: 130, tip: (s) => s.Facilitator, cell: (s) => s.Facilitator || "—" },
    ...(attendanceMode === "none"
      ? []
      : ([{
          id: "att", header: "Attendance", width: 130,
          cell: (s: ScheduleItem) => {
            const a = myAttendance(attendance, s.ScheduleID, user.UserID);
            return (
              <Button size="sm" variant="ghost" onClick={() => setOpenId(s.ScheduleID)}>
                {a ? <Badge kind={a.Status === "Present" ? "success" : a.Status === "Late" ? "warning" : "error"}>{a.Status} · {a.LoggedDuration}h</Badge> : "Log…"}
              </Button>
            );
          },
        }] satisfies Column<ScheduleItem>[])),
    { id: "resched", header: "Reschedule", width: 190, cell: (s) => <SuggestReschedule slot={s} userId={user.UserID} pending={rescheduleRequests.find((r) => r.ScheduleItemID === s.ScheduleID)} onSubmitted={onChanged} /> },
  ];

  const open = scheduleItems.find((s) => s.ScheduleID === openId) ?? null;

  return (
    <Card
      title={subject ? `Schedule: ${subject.Name}` : "My Schedule"}
      actions={
        <div className="u2-seg" role="group" aria-label="Schedule view">
          {views.map((v) => (
            <button key={v.id} type="button" className="u2-seg__btn" aria-pressed={view === v.id} data-on={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
          ))}
        </div>
      }
    >
      {view === "list" && (
        <div className="u2-toolbar">
          {rangeMode === "select" ? (
            <div style={{ minWidth: 170 }}><Combobox aria-label="Date range" value={range} onChange={(v) => setRange(v as Range)} options={RANGES} /></div>
          ) : (
            <CheckField label="Show past" checked={showPast} onChange={setShowPast} />
          )}
          <input type="search" className="u2-search" placeholder="Search service or instructor…" aria-label="Search schedule" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {view === "weekly" ? (
        <WeeklyGrid services={services} />
      ) : view === "image" ? (
        <ScheduleImageView userId={who.UserID} userName={who.Name} />
      ) : view === "calendar" ? (
        <ScheduleCalendar
          scheduleItems={scheduleItems}
          attendanceItems={attendance}
          readOnly={readOnly}
          viewerTz={viewerTz}
          portalColor={color}
          onLogAttendance={attendanceMode === "quick" ? quickLog : undefined}
          renderExpanded={attendanceMode === "panel" && !readOnly ? (id, s) => <SessionAttendance scheduleId={id} duration={s.Duration} viewerUserId={user.UserID} viewerType={user.UserType} onLogged={onChanged} /> : undefined}
        />
      ) : (
        <DataTable caption="Schedule" rows={rows} columns={cols} rowKey={(s) => s.ScheduleID} initialSort={{ id: "date", dir: "asc" }} emptyText={scheduleItems.length === 0 ? "No sessions yet. Ask Management to enroll you in a Service." : q.trim() ? "No matches." : rangeMode === "select" ? "No upcoming sessions. Try a wider date range above." : 'No upcoming sessions. Tick "Show past" to see history.'} />
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)} title="Attendance" subtitle={open ? `${open.ServiceName} · ${formatDate(open.Date) as string}` : undefined} wide>
        {open &&
          (attendanceMode === "panel" ? (
            <SessionAttendance scheduleId={open.ScheduleID} duration={open.Duration} viewerUserId={user.UserID} viewerType={user.UserType} onLogged={onChanged} />
          ) : myAttendance(attendance, open.ScheduleID, user.UserID) ? (
            <p>Already logged: {myAttendance(attendance, open.ScheduleID, user.UserID)!.Status}, {myAttendance(attendance, open.ScheduleID, user.UserID)!.LoggedDuration}h.</p>
          ) : (
            <MiniAttendanceForm defaultHrs={open.Duration} onSubmit={async (status, hrs) => { await quickLog(open.ScheduleID, status, hrs); setOpenId(null); }} />
          ))}
      </Sheet>
    </Card>
  );
}

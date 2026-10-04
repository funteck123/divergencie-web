"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { groupGradient, groupMatches, normalizeGroup } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";
import { normalizeTimezone, tzAbbrFor } from "@/lib/timezones";
import { Button, LinkButton } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { CheckField, Field, TextInput } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { useEnrollments } from "@/ui2/queries/enrollments";
import { useAllAttendance, useOfferSlot, useRescheduleRequests, useReviewReschedule, useSchedule } from "@/ui2/queries/schedule";
import { useServices } from "@/ui2/queries/services";
import type { RescheduleRequest, ScheduleItem } from "@/ui2/queries/types";
import "@/ui2/features/accounts/accounts.css";
import "@/ui2/features/billing/billing.css";
import "@/ui2/features/services/services.css";
import { RescheduleCell } from "./RescheduleCell";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { SessionAttendance } from "./SessionAttendance";
import { agenda, conflictingScheduleIds, dropPast, matchesSearch, openPoolSlots, serviceSlots } from "./scheduleLogic";
import "./schedule.css";

const BOOKING_TYPES = ["Trial", "TeacherInterview", "StaffInterview", "AmbassadorInterview"];
const REQUIRED_GROUP: Record<string, string> = { Trial: "Student", TeacherInterview: "Teacher", StaffInterview: "Staff", AmbassadorInterview: "Ambassador" };
const BOOKING_LABEL: Record<string, string> = { Trial: "Trial", TeacherInterview: "Interview — Teacher", StaffInterview: "Interview — Staff", AmbassadorInterview: "Interview — Ambassador" };

const when = (s: ScheduleItem) => `${s.Time} ${tzAbbrFor(s.Date, normalizeTimezone(s.Timezone))}`;
const swatch = (s: ScheduleItem) => <span title={(normalizeGroup(s.ServiceGroup) as string[]).join(" + ")} className="u2-swatch" style={{ background: groupGradient(normalizeGroup(s.ServiceGroup)) as string }} />;

export function ScheduleView() {
  const sched = useSchedule();
  const services = useServices();
  const enrollments = useEnrollments();
  const attendance = useAllAttendance();
  const requests = useRescheduleRequests();
  const review = useReviewReschedule();
  const [resolveId, setResolveId] = useState<string | null>(null);

  const items = useMemo(() => sched.data?.scheduleItems ?? [], [sched.data]);
  const att = useMemo(() => attendance.data ?? [], [attendance.data]);
  const conflicts = useMemo(() => conflictingScheduleIds(att), [att]);
  const conflictItems = useMemo(() => items.filter((i) => conflicts.has(i.ScheduleID)), [items, conflicts]);
  const reqs = requests.data ?? [];
  const failed = sched.error ?? services.error ?? enrollments.error ?? attendance.error ?? requests.error;

  const reqColumns: Column<RescheduleRequest>[] = [
    { id: "service", header: "Service", sortValue: (r) => r.Slot?.ServiceName ?? "", cell: (r) => r.Slot?.ServiceName || "—" },
    { id: "by", header: "Requested by", width: 170, sortValue: (r) => r.RequesterName, cell: (r) => r.RequesterName },
    { id: "current", header: "Current", width: 150, cell: (r) => (r.Slot ? `${formatDate(r.Slot.RescheduledDate || r.Slot.Date) as string} ${r.Slot.RescheduledTime || r.Slot.Time}` : "—") },
    { id: "requested", header: "Requested", width: 150, sortValue: (r) => `${r.RequestedDate} ${r.RequestedTime}`, cell: (r) => `${formatDate(r.RequestedDate) as string} ${r.RequestedTime}` },
    {
      id: "actions", header: "Action", width: 170,
      cell: (r) => (
        <span className="u2-rowactions">
          <Button size="sm" variant="primary" disabled={review.isPending} onClick={async () => { try { await review.mutateAsync({ requestId: r.RescheduleRequestID, action: "approve" }); toast.success("Reschedule approved."); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed."); } }}>Approve</Button>
          <Button size="sm" variant="ghost" disabled={review.isPending} onClick={async () => { try { await review.mutateAsync({ requestId: r.RescheduleRequestID, action: "reject" }); toast.success("Reschedule rejected."); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed."); } }}>Reject</Button>
        </span>
      ),
    },
  ];
  const conflictColumns: Column<ScheduleItem>[] = [
    { id: "service", header: "Service", sortValue: (s) => s.ServiceName ?? "", cell: (s) => s.ServiceName },
    { id: "date", header: "Date", width: 100, sortValue: (s) => s.Date, cell: (s) => formatDate(s.Date) as string },
    { id: "time", header: "Time", width: 100, sortValue: (s) => s.Time, cell: when },
    { id: "who", header: "Instructor", width: 160, sortValue: (s) => s.Facilitator ?? "", cell: (s) => s.Facilitator || "—" },
    { id: "act", header: "", width: 90, cell: (s) => <Button size="sm" variant="primary" onClick={() => setResolveId(s.ScheduleID)}>Resolve</Button> },
  ];

  return (
    <section className="u2-accounts">
      <h1>Schedule</h1>
      {failed && <div role="alert" className="u2-errorbox">Could not load the schedule: {failed.message}</div>}

      {conflictItems.length > 0 && (
        <section className="u2-box">
          <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Attendance Conflicts ({conflictItems.length})</h2>
          <DataTable caption="Attendance conflicts" rows={conflictItems} columns={conflictColumns} rowKey={(s) => s.ScheduleID} initialSort={{ id: "date", dir: "asc" }} />
        </section>
      )}
      {reqs.length > 0 && (
        <section className="u2-box">
          <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Pending Reschedule Requests ({reqs.length})</h2>
          <DataTable caption="Pending reschedule requests" rows={reqs} columns={reqColumns} rowKey={(r) => r.RescheduleRequestID} initialSort={{ id: "requested", dir: "asc" }} />
        </section>
      )}

      <div className="u2-split">
        <OfferSlot items={items} openIds={sched.data?.openPoolSlotIds ?? []} services={services.data ?? []} loading={sched.isPending} />
        <ServiceSchedule items={items} attendance={att} enrollments={enrollments.data ?? []} requests={reqs} conflictIds={conflicts} loading={sched.isPending} onOpen={setResolveId} />
      </div>

      <Sheet open={!!resolveId} onOpenChange={(o) => !o && setResolveId(null)} title="Session attendance" subtitle={resolveId ?? undefined} wide>
        {resolveId && <SessionAttendance scheduleId={resolveId} duration={items.find((i) => i.ScheduleID === resolveId)?.Duration ?? 1} isManagement />}
      </Sheet>
    </section>
  );
}

function OfferSlot({ items, openIds, services, loading }: { items: readonly ScheduleItem[]; openIds: readonly string[]; services: readonly import("@/ui2/queries/types").ServiceRecord[]; loading: boolean }) {
  const offer = useOfferSlot();
  const [serviceType, setServiceType] = useState("Trial");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | string>(1);
  const [facilitator, setFacilitator] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [q, setQ] = useState("");
  const pool = useMemo(() => openPoolSlots({ scheduleItems: items, openPoolSlotIds: openIds }), [items, openIds]);
  const poolRows = useMemo(() => pool.filter((s) => matchesSearch(s, q)), [pool, q]);
  const eligible = services.filter((s) => groupMatches(s.Group, REQUIRED_GROUP[serviceType] || "Staff") as boolean);

  const columns: Column<ScheduleItem>[] = [
    { id: "type", header: "Type", width: 110, sortValue: (s) => s.ServiceType ?? "", cell: (s) => s.ServiceType },
    { id: "service", header: "Service", sortValue: (s) => s.ServiceName ?? "", tip: (s) => s.ServiceName, cell: (s) => <>{swatch(s)}{s.ServiceName}</> },
    { id: "date", header: "Date", width: 100, sortValue: (s) => s.Date, cell: (s) => formatDate(s.Date) as string },
    { id: "time", header: "Time", width: 100, sortValue: (s) => s.Time, cell: when },
    { id: "who", header: "Instructor", width: 130, sortValue: (s) => s.Facilitator ?? "", cell: (s) => s.Facilitator },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await offer.mutateAsync({ serviceType, serviceId, date, time, duration, facilitator });
      toast.success("Slot offered.");
      setDate("");
      setTime("");
      setFacilitator("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not offer the slot.");
    }
  }

  return (
    <section className="u2-box">
      <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Offer a Trial / Interview Slot</h2>
      <p className="u2-muted" style={{ margin: 0 }}>Open pool: any Trial or Interview account can request a slot; several requests on the same slot are fine. Management approves one, which locks the slot and (for Trial) bills one month in advance for that service.</p>
      <form onSubmit={submit} className="u2-form">
        <Field label="Slot type">
          <Combobox value={serviceType} onChange={(v) => { setServiceType(v); setServiceId(""); }} options={BOOKING_TYPES.map((t) => ({ value: t, label: BOOKING_LABEL[t] ?? t }))} />
        </Field>
        <Field label="Service">
          <Combobox value={serviceId} onChange={setServiceId} placeholder="Select service…" options={eligible.map((s) => ({ value: s.ServiceID, label: s.Name }))} />
        </Field>
        <div className="u2-grid2">
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Time" hint="IST (India)"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></Field>
          <Field label="Duration (hrs)"><TextInput type="number" step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="Instructor"><TextInput value={facilitator} onChange={(e) => setFacilitator(e.target.value)} /></Field>
        </div>
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <div className="u2-form__actions">
          <Button type="submit" variant="primary" loading={offer.isPending} disabled={!serviceId} disabledReason="Select a service first.">Offer slot</Button>
        </div>
      </form>
      <div className="u2-toolbar">
        <h3 style={{ margin: 0 }}>Open pool slots</h3>
        <div className="u2-seg" role="group" aria-label="Pool view">
          <button type="button" className="u2-seg__btn" aria-pressed={view === "list"} data-on={view === "list"} onClick={() => setView("list")}>List</button>
          <button type="button" className="u2-seg__btn" aria-pressed={view === "calendar"} data-on={view === "calendar"} onClick={() => setView("calendar")}>Calendar</button>
        </div>
      </div>
      {view === "calendar" ? (
        <ScheduleCalendar scheduleItems={pool} attendanceItems={[]} readOnly colorByGroup />
      ) : (
        <>
          <input type="search" className="u2-search" placeholder="Search service or instructor…" aria-label="Search pool" value={q} onChange={(e) => setQ(e.target.value)} />
          <DataTable caption="Open pool slots" rows={poolRows} columns={columns} rowKey={(s) => s.ScheduleID} loading={loading} initialSort={{ id: "date", dir: "asc" }} emptyText={pool.length === 0 ? "No open pool slots." : "No matches."} />
        </>
      )}
    </section>
  );
}

type View = "agenda" | "list" | "calendar" | "image";
const VIEWS: { id: View; label: string }[] = [{ id: "agenda", label: "Agenda" }, { id: "list", label: "List" }, { id: "calendar", label: "Calendar" }, { id: "image", label: "Weekly Schedule Image" }];

function ServiceSchedule({ items, attendance, enrollments, requests, conflictIds, loading, onOpen }: { items: readonly ScheduleItem[]; attendance: readonly import("@/ui2/queries/types").AttendanceItem[]; enrollments: readonly import("@/ui2/queries/types").EnrollmentRecord[]; requests: readonly RescheduleRequest[]; conflictIds: ReadonlySet<string>; loading: boolean; onOpen: (id: string) => void }) {
  const [viewParam, setView] = useQueryState("view", parseAsString.withDefault("agenda"));
  const view: View = (VIEWS.some((v) => v.id === viewParam) ? viewParam : "agenda") as View;
  const [showPast, setShowPast] = useState(false);
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [q, setQ] = useState("");
  const slots = useMemo(() => serviceSlots(items, enrollments), [items, enrollments]);
  const rows = useMemo(() => {
    let r = dropPast(slots, showPast);
    if (conflictsOnly) r = r.filter((s) => conflictIds.has(s.ScheduleID));
    return r.filter((s) => matchesSearch(s, q));
  }, [slots, showPast, conflictsOnly, conflictIds, q]);
  const count = (id: string) => attendance.filter((a) => a.ScheduleItemID === id).length;

  const columns: Column<ScheduleItem>[] = [
    { id: "service", header: "Service", sortValue: (s) => s.ServiceName ?? "", tip: (s) => s.ServiceName, cell: (s) => <>{swatch(s)}{s.ServiceName}</> },
    { id: "date", header: "Date", width: 96, sortValue: (s) => s.Date, cell: (s) => formatDate(s.Date) as string },
    { id: "time", header: "Time", width: 92, sortValue: (s) => s.Time, cell: when },
    { id: "hrs", header: "Hrs", width: 44, numeric: true, sortValue: (s) => Number(s.Duration), cell: (s) => s.Duration },
    { id: "who", header: "Instructor", width: 110, sortValue: (s) => s.Facilitator ?? "", tip: (s) => s.Facilitator, cell: (s) => s.Facilitator },
    { id: "att", header: "Attendance", width: 104, cell: (s) => <Button size="sm" variant="ghost" onClick={() => onOpen(s.ScheduleID)}>{count(s.ScheduleID) > 0 ? `${count(s.ScheduleID)} logged` : "None"}{conflictIds.has(s.ScheduleID) ? " ⚠" : ""}</Button> },
    { id: "resched", header: "Reschedule", width: 210, cell: (s) => <RescheduleCell slot={s} pending={requests.find((r) => r.ScheduleItemID === s.ScheduleID)} /> },
  ];

  return (
    <section className="u2-box">
      <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Service Schedule (auto-generated)</h2>
      <div className="u2-seg" role="group" aria-label="Schedule view">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" className="u2-seg__btn" aria-pressed={view === v.id} data-on={view === v.id} onClick={() => void setView(v.id === "agenda" ? null : v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {(view === "list" || view === "agenda") && (
        <div className="u2-toolbar">
          <input type="search" className="u2-search" placeholder="Search service or instructor…" aria-label="Search schedule" value={q} onChange={(e) => setQ(e.target.value)} />
          <CheckField label="Show past" checked={showPast} onChange={setShowPast} />
          <CheckField label={`Conflicts only${conflictIds.size > 0 ? ` (${conflictIds.size})` : ""}`} checked={conflictsOnly} onChange={setConflictsOnly} />
        </div>
      )}
      {view === "image" ? (
        <div className="u2-rows">
          <div className="u2-imagebox">
            {/* unoptimized: the route needs the caller's own session cookie, which the Next image optimizer would not forward. */}
            <Image src="/api/schedule/admin-image" alt="Weekly schedule" fill style={{ objectFit: "contain" }} unoptimized />
          </div>
          <LinkButton href="/api/schedule/admin-image?download=1" download="DC_Admin_Weekly_Schedule.png">
            Download PNG
          </LinkButton>
        </div>
      ) : view === "calendar" ? (
        <ScheduleCalendar scheduleItems={slots} attendanceItems={attendance} readOnly colorByGroup renderExpanded={(id, s) => <SessionAttendance scheduleId={id} duration={s.Duration} isManagement />} />
      ) : view === "agenda" ? (
        rows.length === 0 ? (
          <p className="u2-muted">{slots.length === 0 ? "No sessions." : 'No upcoming sessions. Tick "Show past" to see history.'}</p>
        ) : (
          <div className="u2-agenda">
            {agenda(rows).map((d) => (
              <section key={d.date} className="u2-agenda__day" aria-label={d.date}>
                <h3 className="u2-agenda__date">{formatDate(d.date) as string}</h3>
                {d.items.map((s) => (
                  <div key={s.ScheduleID} className="u2-agenda__row">
                    <span>{when(s)}</span>
                    <strong className="u2-strong">{swatch(s)}{s.ServiceName}</strong>
                    <span className="u2-muted">{s.Duration}h</span>
                    <span className="u2-muted">{s.Facilitator}</span>
                    <Button size="sm" variant="ghost" onClick={() => onOpen(s.ScheduleID)}>{count(s.ScheduleID) > 0 ? `${count(s.ScheduleID)} logged` : "Attendance"}{conflictIds.has(s.ScheduleID) ? " ⚠" : ""}</Button>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )
      ) : (
        <DataTable caption="Service schedule" rows={rows} columns={columns} rowKey={(s) => s.ScheduleID} loading={loading} initialSort={{ id: "date", dir: "asc" }} emptyText={slots.length === 0 ? "No sessions." : 'No upcoming sessions. Tick "Show past" to see history.'} />
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { formatInternationalNumber } from "@/lib/countryCodes";
import { formatRate } from "@/lib/client";
import { timezoneLabel } from "@/lib/timezones";
import { Button } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/ui2/queries/client";
import type { GuideRecord, UserRecord } from "@/ui2/queries/types";
import { occurrencesText, weekly, type EnrolledService } from "./portalLogic";
import "@/ui2/features/accounts/accounts.css";
import "./portal.css";

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="u2-box">
      <div className="u2-toolbar">
        <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>{title}</h2>
        {actions && <span className="u2-toolbar__new">{actions}</span>}
      </div>
      {children}
    </section>
  );
}

const link = (url?: string) => (url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : "—");

/** The person's own details. Which rows show depends on the account type, as in classic. */
export function MyInfoCard({ user, linkedChildren }: { user: UserRecord; linkedChildren?: readonly UserRecord[] }) {
  const t = user.UserType;
  const rows: [string, ReactNode][] = [["Account ID", user.UserID], ["Name", user.Name], ["Type", t], ["Status", user.Status]];
  if (["Student", "Teacher", "Staff", "Ambassador"].includes(t)) rows.push(["Timezone", timezoneLabel(user.Timezone) as string]);
  if (t === "Student") rows.push(["Course", user.Course || "—"]);
  if (["Student", "Teacher"].includes(t)) rows.push(["Batch", user.Batch || "—"]);
  if (["Teacher", "Staff", "Ambassador"].includes(t)) {
    rows.push(["Role", user.Role || "—"], ["Department", user.Department || "—"], ["Passport / IC Number", user.PassportNumber || "—"], ["WhatsApp Number", formatInternationalNumber(user.WhatsAppNumber) || "—"], ["Email", user.Email || "—"]);
  }
  rows.push(["Currency", user.Currency || "INR"]);
  if (t === "Student")
    rows.push(["WhatsApp Number", formatInternationalNumber(user.WhatsAppNumber) || "—"], ["Parent WhatsApp Number", formatInternationalNumber(user.ParentWhatsAppNumber) || "—"], ["Email", user.Email || "—"], ["School", user.School || "—"], ["Location", user.Location || "—"], ["Timesheet", link(user.TimesheetURL)], ["Progress Tracker", link(user.ProgressTrackerURL)]);
  if (t === "Staff") rows.push(["Work Folder", link(user.WorkFolderURL)], ["Timesheet", link(user.TimesheetURL)]);
  if (linkedChildren) rows.push(["Linked children", linkedChildren.length ? linkedChildren.map((c) => `${c.Name} (${c.UserID})`).join(", ") : "—"]);
  return (
    <Card title="My Info">
      <dl className="u2-import__facts">
        {rows.map(([k, v], i) => (
          <div key={`${k}${i}`}>
            <dt>{k}</dt>
            <dd>{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function EnrollmentsCard({ services }: { services: readonly EnrolledService[] }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => services.filter((s) => !q.trim() || (s.Name || "").toLowerCase().includes(q.trim().toLowerCase())), [services, q]);
  const cols: Column<EnrolledService>[] = [
    { id: "name", header: "Service", sortValue: (s) => s.Name, tip: (s) => s.Name, cell: (s) => s.Name },
    { id: "type", header: "Type", width: 100, cell: (s) => s.Type },
    { id: "rate", header: "Rate", width: 130, cell: (s) => formatRate(s._myRate) as string },
    { id: "occ", header: "Occurrences", tip: (s) => occurrencesText(s), cell: (s) => <span className="u2-muted">{occurrencesText(s)}</span> },
  ];
  return (
    <Card title="My Enrollments">
      <input type="search" className="u2-search" placeholder="Search service…" aria-label="Search enrollments" value={q} onChange={(e) => setQ(e.target.value)} />
      <DataTable caption="My enrollments" rows={rows} columns={cols} rowKey={(s) => s.ServiceID} initialSort={{ id: "name", dir: "asc" }} emptyText={services.length === 0 ? "No enrollments yet. Ask Management to enroll you in a Service." : "No matches."} />
    </Card>
  );
}

export function GuidesCard({ guides }: { guides?: readonly GuideRecord[] }) {
  if (!guides || guides.length === 0) return null;
  return (
    <Card title="Guides">
      <div className="u2-checks">
        {guides.map((g) => (
          <a key={g.GuideID} className="u2-pill" href={g.Url} target="_blank" rel="noopener noreferrer">{g.Name}</a>
        ))}
      </div>
    </Card>
  );
}

const SERVICE_FEATURES = [{ slug: "recordings", label: "Recordings", linkField: "RecordingsLink", toggleKey: "recordings" }, { slug: "gcr", label: "Google Classroom", linkField: "GCRLink", toggleKey: "gcr" }];
const USER_FEATURES = [{ slug: "timesheet", label: "Timesheet", toggleKey: "timesheet", linkField: "TimesheetURL" }, { slug: "progress-tracker", label: "Progress Tracker", toggleKey: "progressTracker", linkField: "ProgressTrackerURL" }];
const DEFAULT_TOGGLES: Record<string, boolean> = { recordings: false, syllabus: true, worksheets: true, gcr: true, timesheet: true, progressTracker: true };

/** Resource buttons for the person and for each enrolled service, switched on and off by Management for everyone. */
export function ResourcesCard({ services, user, showExternalTools = false }: { services: readonly EnrolledService[]; user: UserRecord; showExternalTools?: boolean }) {
  const toggles = useQuery({ queryKey: ["resource-toggles-public"] as const, queryFn: async () => (await apiFetch<{ toggles: Record<string, boolean> }>("/api/resource-toggles")).toggles, retry: false });
  const syllabus = useQuery({ queryKey: ["syllabus-config"] as const, enabled: showExternalTools, retry: false, queryFn: async () => (await apiFetch<{ url?: string }>("/api/syllabus-config")).url || null });
  const t = toggles.data ?? DEFAULT_TOGGLES; // a failed fetch keeps the all-on-except-recordings default
  return (
    <Card title="Resources">
      <div className="u2-checks">
        {USER_FEATURES.filter((f) => t[f.toggleKey]).map((f) => {
          const ext = (user[f.linkField] as string | undefined) || "";
          return <Link key={f.slug} className="u2-pill" href={`/v2/resources/${f.slug}${ext ? `?${new URLSearchParams({ link: ext })}` : ""}`}>{f.label}</Link>;
        })}
        {showExternalTools && syllabus.data && (
          <Link className="u2-pill" href="/v2/syllabus">Syllabus Viewer</Link>
        )}
        {showExternalTools && (
          <Link className="u2-pill" href="/v2/question-solver">DC Question Solver</Link>
        )}
      </div>
      {services.length === 0 ? (
        <p className="u2-muted">No enrollments yet.</p>
      ) : (
        <div className="u2-rows">
          {services.map((s) => (
            <div key={s.ServiceID} className="u2-box u2-box--inner">
              <strong className="u2-strong">{s.Name}</strong>
              <div className="u2-checks">
                {SERVICE_FEATURES.filter((f) => t[f.toggleKey]).map((f) => {
                  const ext = (s[f.linkField] as string | undefined) || "";
                  const p = new URLSearchParams({ serviceId: s.ServiceID, serviceName: s.Name });
                  if (ext) p.set("link", ext);
                  return <Link key={f.slug} className="u2-pill" href={`/v2/resources/${f.slug}?${p}`}>{f.label}</Link>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Staff have two direct links instead of the Resources buttons. */
export function StaffResourcesCard({ user }: { user: UserRecord }) {
  return (
    <Card title="Resources">
      <div className="u2-checks">
        {[["Work Folder", "WorkFolderURL"], ["Timesheet", "TimesheetURL"]].map(([label, field]) => {
          const url = user[field as string] as string | undefined;
          return url ? <a key={field} className="u2-pill" href={url} target="_blank" rel="noreferrer">{label}</a> : <span key={field} className="u2-pill u2-pill--off" title="Not set yet. Ask Management." aria-disabled="true">{label}</span>;
        })}
      </div>
    </Card>
  );
}

/** Weekly view: recurring slots per weekday. */
export function WeeklyGrid({ services }: { services: readonly EnrolledService[] }) {
  const w = weekly(services);
  if (!w.hasAny) return <p className="u2-muted">No recurring occurrences yet.{w.unscheduled > 0 && ` (${w.unscheduled} not scheduled yet)`}</p>;
  return (
    <>
      {w.unscheduled > 0 && <p className="u2-muted">{w.unscheduled} enrollment{w.unscheduled === 1 ? "" : "s"} not scheduled yet, not shown below.</p>}
      <div className="u2-week">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
          <div key={d} className="u2-week__day">
            <div className="u2-muted">{d.slice(0, 3)}</div>
            {(w.byDay.get(d) ?? []).map((o, i) => (
              <span key={i} className="u2-chip u2-chip--info">{o.Time} {o.serviceLabel} ({o.Duration}h){o.Facilitator ? ` · ${o.Facilitator}` : ""}</span>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function ScheduleImageView({ userId, userName }: { userId: string; userName: string }) {
  return (
    <div className="u2-rows">
      <div className="u2-imagebox">
        {/* eslint-disable-next-line @next/next/no-img-element -- the route needs the caller's own session cookie; the Next image optimizer would not forward it */}
        <img src={`/api/schedule/image?userId=${userId}`} alt={`${userName}'s schedule`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <a className="u2-linkbtn" href={`/api/schedule/image?userId=${userId}&download=1`} download={`DC_Schedule_${userName}.png`}>Download PNG</a>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" onClick={onClick}>← Back</Button>;
}

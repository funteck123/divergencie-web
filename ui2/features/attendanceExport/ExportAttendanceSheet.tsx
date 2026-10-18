"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { Field } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { Skeleton } from "@/ui2/components/Skeleton";
import { useEnrollments } from "@/ui2/queries/enrollments";
import { useAllAttendance, useSchedule } from "@/ui2/queries/schedule";
import type { UserRecord } from "@/ui2/queries/types";
import { buildExportRows, exportFilename, filterMonths, monthLabel, SESSION_HEADER, sessionLines, SUMMARY_HEADER, summarizeMonths, summaryLines, toCsv } from "./exportLogic";
import "@/ui2/features/accounts/accounts.css";

function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const todayString = () => new Date().toISOString().slice(0, 10);

/** TKT-0354: every attendance record of one account, month by month, as a spreadsheet file. */
export function ExportAttendanceSheet({ user, onClose }: { user: UserRecord | null; onClose: () => void }) {
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()} title={user ? `Attendance of ${user.Name}` : "Attendance"} subtitle={user ? `${user.UserID} · ${user.UserType}` : undefined} wide>
      {user && <Body key={user.UserID} user={user} />}
    </Sheet>
  );
}

function Body({ user }: { user: UserRecord }) {
  const schedule = useSchedule();
  const attendance = useAllAttendance();
  const enrollments = useEnrollments();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const failed = schedule.error ?? attendance.error ?? enrollments.error;
  const all = useMemo(
    () => (schedule.data && attendance.data && enrollments.data ? buildExportRows({ userId: user.UserID, attendance: attendance.data, schedule: schedule.data.scheduleItems, enrollments: enrollments.data, today: todayString() }) : null),
    [schedule.data, attendance.data, enrollments.data, user.UserID],
  );
  const months = useMemo(() => [...new Set((all ?? []).map((r) => r.month))].sort(), [all]);
  const rows = useMemo(() => filterMonths(all ?? [], from, to), [all, from, to]);
  const summary = useMemo(() => summarizeMonths(rows), [rows]);
  const range = from > to && to ? "The first month is after the last month." : "";

  if (failed) return <p role="alert" className="u2-errorbox">Could not load the attendance: {failed.message}</p>;
  if (!all) return <Skeleton height={200} label="Loading attendance" />;
  const save = (kind: "sessions" | "monthly") => {
    const csv = kind === "sessions" ? toCsv(SESSION_HEADER, sessionLines(rows)) : toCsv(SUMMARY_HEADER, summaryLines(summary));
    download(exportFilename(user.Name, kind, from, to), csv);
    toast.success(kind === "sessions" ? `Downloaded ${rows.length} sessions.` : `Downloaded ${summary.length} months.`);
  };
  const monthOptions = months.map((m) => (
    <option key={m} value={m}>
      {monthLabel(m)}
    </option>
  ));
  return (
    <div className="u2-rows">
      <div className="u2-split">
        <Field label="From month">
          <select className="u2-input" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">First month</option>
            {monthOptions}
          </select>
        </Field>
        <Field label="To month" error={range}>
          <select className="u2-input" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Last month</option>
            {monthOptions}
          </select>
        </Field>
      </div>
      {all.length === 0 ? (
        <p className="u2-muted">No attendance has been logged for {user.Name} yet, and no past sessions are scheduled for their enrolments.</p>
      ) : (
        <div className="u2-table__wrap">
          <table className="u2-table" aria-label={`Attendance by month for ${user.Name}`}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Sessions</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Not logged</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((m) => (
                <tr key={m.month}>
                  <td>{monthLabel(m.month)}</td>
                  <td>{m.sessions}</td>
                  <td>{m.present}</td>
                  <td>{m.late}</td>
                  <td>{m.absent}</td>
                  <td>{m.notLogged}</td>
                  <td>{m.hours}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={7}>No sessions in these months.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="u2-rowactions">
        <Button variant="primary" disabled={rows.length === 0 || !!range} disabledReason={range || "There are no sessions to download."} onClick={() => save("sessions")}>
          Download every session (CSV)
        </Button>
        <Button variant="ghost" disabled={summary.length === 0 || !!range} disabledReason={range || "There are no months to download."} onClick={() => save("monthly")}>
          Download monthly totals (CSV)
        </Button>
      </div>
      <p className="u2-muted">One row per attendance record, plus a &quot;Not logged&quot; row for each past session of a service this account is enrolled in that has no record. Opens in Excel and Google Sheets.</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import SortableTh from "@/components/SortableTh";
import { api, useSort } from "@/lib/client";

export default function ParentDashboard() {
  return <DashboardShell allowedType="Parent">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api(`/api/me?userId=${user.UserID}`).then(setData);
  }, [user.UserID]);

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  if (data.children.length === 0) {
    return (
      <div className="card">
        <p style={{ color: "var(--muted)" }}>No children linked to this account yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.children.map((child) => (
        <ChildCard key={child.student?.UserID} child={child} />
      ))}
    </div>
  );
}

function ChildCard({ child }) {
  const { student, schedule, attendance, invoices } = child;
  const scheduleRows = schedule.map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const invoiceRows = invoices.map((i) => ({ ...i, _period: i.Year * 100 + i.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const invSort = useSort(invoiceRows, "_period", "desc");

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{student?.Name}</h2>

      <h3 className="text-sm mb-2" style={{ color: "var(--muted)" }}>
        Schedule
      </h3>
      <table className="mb-4">
        <thead>
          <tr>
            <SortableTh label="Service" sortKeyName="ServiceName" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
            <SortableTh label="Date" sortKeyName="_dt" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {schedSort.sorted.map((s) => (
            <tr key={s.ScheduleID}>
              <td>{s.ServiceName}</td>
              <td>{s.Date}</td>
              <td>{s.Time}</td>
            </tr>
          ))}
          {schedSort.sorted.length === 0 && (
            <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No sessions scheduled.</td></tr>
          )}
        </tbody>
      </table>

      <h3 className="text-sm mb-2" style={{ color: "var(--muted)" }}>
        Attendance
      </h3>
      <table className="mb-4">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((a) => (
            <tr key={a.AttendanceID}>
              <td>{a.Date}</td>
              <td>{a.Status}</td>
              <td>{a.LoggedDuration}</td>
            </tr>
          ))}
          {attendance.length === 0 && (
            <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No attendance logged.</td></tr>
          )}
        </tbody>
      </table>

      <h3 className="text-sm mb-2" style={{ color: "var(--muted)" }}>
        Invoices
      </h3>
      <table>
        <thead>
          <tr>
            <SortableTh label="Period" sortKeyName="_period" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <SortableTh label="Amount" sortKeyName="Amount" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <SortableTh label="Status" sortKeyName="Status" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
          </tr>
        </thead>
        <tbody>
          {invSort.sorted.map((i) => (
            <tr key={i.InvoiceID}>
              <td>{i.Month}/{i.Year}</td>
              <td>{i.Amount}</td>
              <td>{i.Status}</td>
            </tr>
          ))}
          {invSort.sorted.length === 0 && (
            <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No invoices yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

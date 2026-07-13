"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import WeeklyOccurrences from "@/components/WeeklyOccurrences";
import ScheduleImage from "@/components/ScheduleImage";
import MyInfo from "@/components/MyInfo";
import SortableTh from "@/components/SortableTh";
import InvoicePaidControl from "@/components/InvoicePaidControl";
import { api, useSort } from "@/lib/client";
import { amountDueInOwnCurrency } from "@/lib/billing";

export default function ParentDashboard() {
  return <DashboardShell allowedType="Parent">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const bundle = await api(`/api/me?userId=${user.UserID}`);
    setData(bundle);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setInvoicePaid(invoiceId, paid) {
    setError("");
    try {
      await api("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({ invoiceId, studentPaidFlag: paid }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function confirmPaid(invoiceId, file) {
    const form = new FormData();
    form.append("invoiceId", invoiceId);
    form.append("file", file);
    const res = await fetch("/api/invoices/mark-paid", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Could not confirm payment.");
    load();
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const linkedChildren = data.children.map((c) => c.student).filter(Boolean);

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <MyInfo user={data.user} linkedChildren={linkedChildren} />

      {data.children.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)" }}>No children linked to this account yet.</p>
        </div>
      ) : (
        data.children.map((child) => (
          <ChildCard
            key={child.student?.UserID}
            child={child}
            services={data.services}
            onSetPaid={setInvoicePaid}
            onConfirmPaid={confirmPaid}
          />
        ))
      )}
    </div>
  );
}

function ChildCard({ child, services, onSetPaid, onConfirmPaid }) {
  const { student, schedule, attendance, invoices, enrollments } = child;
  const [view, setView] = useState("weekly");
  const scheduleRows = schedule.map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const invoiceRows = invoices
    .filter((i) => i.Status !== "Draft")
    .map((i) => ({ ...i, _period: i.Year * 100 + i.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const invSort = useSort(invoiceRows, "_period", "desc");
  const enrolledServices = (enrollments || [])
    .map((e) => (services || []).find((s) => s.ServiceID === e.ServiceID))
    .filter(Boolean);

  function serviceNameOf(id) {
    const s = (services || []).find((s) => s.ServiceID === id);
    return s ? (s.Code ? `${s.Code} · ${s.Name}` : s.Name) : "—";
  }

  function scheduleItemFor(scheduleItemId) {
    return schedule.find((s) => s.ScheduleID === scheduleItemId);
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">{student?.Name}</h2>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm" style={{ color: "var(--muted)" }}>
          Schedule
        </h3>
        <div className="flex gap-2">
          <button className={view === "weekly" ? "btn" : "btn-ghost"} onClick={() => setView("weekly")}>
            Weekly
          </button>
          <button className={view === "calendar" ? "btn" : "btn-ghost"} onClick={() => setView("calendar")}>
            Calendar
          </button>
          <button className={view === "list" ? "btn" : "btn-ghost"} onClick={() => setView("list")}>
            List
          </button>
          <button className={view === "image" ? "btn" : "btn-ghost"} onClick={() => setView("image")}>
            Schedule Image
          </button>
        </div>
      </div>
      <div className="mb-4">
        {view === "weekly" ? (
          <WeeklyOccurrences services={enrolledServices} />
        ) : view === "image" ? (
          <ScheduleImage userId={student.UserID} userName={student.Name} />
        ) : view === "calendar" ? (
          <ScheduleCalendar scheduleItems={schedule} attendanceItems={attendance} readOnly />
        ) : (
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="_dt" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <th>Time</th>
                <th>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {schedSort.sorted.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceName}</td>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator || "—"}</td>
                </tr>
              ))}
              {schedSort.sorted.length === 0 && (
                <tr><td colSpan={4} style={{ color: "var(--muted)" }}>No sessions scheduled.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="text-sm mb-2" style={{ color: "var(--muted)" }}>
        Attendance
      </h3>
      <table className="mb-4">
        <thead>
          <tr>
            <th>Service</th>
            <th>Date</th>
            <th>Time</th>
            <th>Instructor</th>
            <th>Status</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((a) => {
            const session = scheduleItemFor(a.ScheduleItemID);
            return (
              <tr key={a.AttendanceID}>
                <td>{session?.ServiceName || "—"}</td>
                <td>{a.Date}</td>
                <td>{session?.Time || "—"}</td>
                <td>{session?.Facilitator || "—"}</td>
                <td>
                  <span className={`badge badge-${a.Status === "Present" ? "good" : a.Status === "Late" ? "pending" : "bad"}`}>
                    {a.Status}
                  </span>
                </td>
                <td>{a.LoggedDuration}</td>
              </tr>
            );
          })}
          {attendance.length === 0 && (
            <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No attendance logged.</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm" style={{ color: "var(--muted)" }}>
          Invoices
        </h3>
        {process.env.NEXT_PUBLIC_STRIPE_GATEWAY && (
          <a className="btn" href={process.env.NEXT_PUBLIC_STRIPE_GATEWAY} target="_blank" rel="noreferrer">
            Pay by card online
          </a>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <SortableTh label="Period" sortKeyName="_period" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <th>Service</th>
            <SortableTh label="Amount" sortKeyName="Amount" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <th>Amount Due</th>
            <th>Total ({student?.Currency || "INR"})</th>
            <th>Paid</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invSort.sorted.map((i) => (
            <tr key={i.InvoiceID}>
              <td>{i.Month}/{i.Year}</td>
              <td>{serviceNameOf(i.ServiceID)}</td>
              <td>{i.Currency || student?.Currency || "INR"} {i.Amount}</td>
              <td>{i.Currency || student?.Currency || "INR"} {amountDueInOwnCurrency(i, student?.Currency).toFixed(2)}</td>
              <td>{i.ConvertedTotal != null ? `${student?.Currency || "INR"} ${i.ConvertedTotal.toFixed(2)}` : "—"}</td>
              <td>
                <InvoicePaidControl
                  invoice={i}
                  onMarkUnpaid={(id) => onSetPaid(id, false)}
                  onConfirmPaid={onConfirmPaid}
                />
              </td>
              <td>
                <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/pdf?invoiceId=${i.InvoiceID}`} download>
                  PDF
                </a>
              </td>
            </tr>
          ))}
          {invSort.sorted.length === 0 && (
            <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No invoices yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

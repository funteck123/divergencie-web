"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import WeeklyOccurrences from "@/components/WeeklyOccurrences";
import ScheduleImage from "@/components/ScheduleImage";
import MyInfo from "@/components/MyInfo";
import GuidesSection from "@/components/GuidesSection";
import RescheduleControl from "@/components/RescheduleControl";
import SortableTh from "@/components/SortableTh";
import InvoicePaidControl from "@/components/InvoicePaidControl";
import { api, useSort, todayDateStr } from "@/lib/client";
import { amountDueInOwnCurrency, batchesOf, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";

export default function ParentDashboard() {
  return <DashboardShell allowedType="Parent">{(user) => <Body user={user} />}</DashboardShell>;
}

// TKT-0039: the payment link (a fixed-price Stripe Payment Link, not a
// per-amount Checkout Session — this app has no live Stripe API key, only
// this static checkout URL) can't actually charge the right amount for a
// given invoice. Tagging it with client_reference_id (the invoice this
// click was for) at least lets a payment be matched back to the right
// invoice afterward. No email prefill here (unlike the same helper on the
// Student dashboard): a Parent account has no Email field of its own.
function stripePaymentLink(invoiceId) {
  const url = new URL(process.env.NEXT_PUBLIC_STRIPE_GATEWAY);
  url.searchParams.set("client_reference_id", invoiceId);
  return url.toString();
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

  // Replaces one invoice in place across every child's invoices array.
  // Both /api/invoices PATCH and /api/invoices/mark-paid POST return the
  // full updated { invoice }, so no refetch is needed to re-render it.
  function applyUpdatedInvoice(invoice) {
    setData((prev) => ({
      ...prev,
      children: prev.children.map((child) => ({
        ...child,
        invoices: child.invoices.map((i) => (i.InvoiceID === invoice.InvoiceID ? invoice : i)),
      })),
    }));
  }

  async function setInvoicePaid(invoiceId, paid) {
    setError("");
    try {
      const res = await api("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({ invoiceId, studentPaidFlag: paid }),
      });
      applyUpdatedInvoice(res.invoice);
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
    applyUpdatedInvoice(body.invoice);
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const linkedChildren = data.children.map((c) => c.student).filter(Boolean);

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <MyInfo user={data.user} linkedChildren={linkedChildren} />

      <GuidesSection guides={data.guides} />

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
            parentUserId={data.user.UserID}
            onRescheduleSubmitted={load}
          />
        ))
      )}
    </div>
  );
}

function ChildCard({ child, services, onSetPaid, onConfirmPaid, parentUserId, onRescheduleSubmitted }) {
  const { student, schedule, attendance, invoices, enrollments, rescheduleRequests } = child;
  const [view, setView] = useState("weekly");
  // TKT-0027: hide past schedule entries by default in the List view.
  const [showPastSchedule, setShowPastSchedule] = useState(false);
  const todayStr = todayDateStr();
  const scheduleRows = schedule
    .filter((s) => showPastSchedule || s.Date >= todayStr)
    .map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const invoiceRows = invoices
    .filter((i) => i.Status !== "Draft")
    .map((i) => ({ ...i, _period: i.Year * 100 + i.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const invSort = useSort(invoiceRows, "_period", "desc");
  const enrolledServices = (enrollments || [])
    .map((e) => {
      const s = (services || []).find((s) => s.ServiceID === e.ServiceID);
      if (!s) return null;
      const batches = batchesOf(s);
      const myBatch = e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0];
      // A Staff-role Service (Role/Department, no Batches) keeps its
      // OccuranceList directly on the Service.
      const myOccurrences = batches.length > 0 ? myBatch?.OccuranceList || [] : s.OccuranceList || [];
      return { ...s, _myBatch: myBatch, _myOccurrences: myOccurrences };
    })
    .filter(Boolean);

  function serviceNameOf(id, batchId) {
    const s = (services || []).find((s) => s.ServiceID === id);
    return s ? lineItemName(s, batchId) : "—";
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
      {view === "list" && (
        <label className="text-sm flex items-center gap-2 mb-2" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={showPastSchedule} onChange={(e) => setShowPastSchedule(e.target.checked)} />
          Show past
        </label>
      )}
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
                <th>Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {schedSort.sorted.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceName}</td>
                  <td>{formatDate(s.Date)}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator || "—"}</td>
                  <td>
                    <RescheduleControl
                      slot={s}
                      userId={parentUserId}
                      pendingRequest={(rescheduleRequests || []).find((r) => r.ScheduleItemID === s.ScheduleID)}
                      onSubmitted={onRescheduleSubmitted}
                    />
                  </td>
                </tr>
              ))}
              {schedSort.sorted.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    {schedule.length === 0 ? "No sessions scheduled." : "No upcoming sessions — check \"Show past\" to see history."}
                  </td>
                </tr>
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
                <td>{formatDate(a.Date)}</td>
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

      <h3 className="text-sm mb-2" style={{ color: "var(--muted)" }}>
        Invoices
      </h3>
      <table>
        <thead>
          <tr>
            <SortableTh label="Period" sortKeyName="_period" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <th>Service</th>
            <SortableTh label="Amount" sortKeyName="Amount" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
            <th>Amount Due</th>
            <th>Total Due ({student?.Currency || "INR"})</th>
            <th>Paid</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invSort.sorted.map((i) => (
            <tr key={i.InvoiceID}>
              <td>
                {i.Month}/{i.Year}
                {/* TKT-0107: SentAt existed on the record already, never shown here. */}
                {i.SentAt && (
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    Sent {formatDate(i.SentAt)}
                  </div>
                )}
              </td>
              <td>
                {Array.isArray(i.LineItems) ? (
                  <div className="space-y-1">
                    {i.LineItems.map((li, idx) => (
                      <div key={li.LineItemID || idx}>{serviceNameOf(li.ServiceID, li.BatchID)}</div>
                    ))}
                  </div>
                ) : (
                  serviceNameOf(i.ServiceID, i.BatchID)
                )}
              </td>
              <td>{i.Currency || "INR"} {i.Amount}</td>
              <td>{i.Currency || "INR"} {amountDueInOwnCurrency(i).toFixed(2)}</td>
              <td>{i.ConvertedDue != null ? `${student?.Currency || "INR"} ${i.ConvertedDue.toFixed(2)}` : "—"}</td>
              <td>
                <InvoicePaidControl
                  invoice={i}
                  onMarkUnpaid={(id) => onSetPaid(id, false)}
                  onConfirmPaid={onConfirmPaid}
                />
              </td>
              <td>
                <span className="flex items-center gap-1 flex-wrap">
                  {process.env.NEXT_PUBLIC_STRIPE_GATEWAY && !i.StudentPaidFlag && (
                    <a
                      className="btn-ghost"
                      style={{ whiteSpace: "nowrap" }}
                      href={stripePaymentLink(i.InvoiceID)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pay online
                    </a>
                  )}
                  <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/pdf?invoiceId=${i.InvoiceID}`} download>
                    PDF
                  </a>
                </span>
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

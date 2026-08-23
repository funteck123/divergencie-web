"use client";

import { Fragment, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import SessionAttendance from "@/components/SessionAttendance";
import WeeklyOccurrences from "@/components/WeeklyOccurrences";
import ScheduleImage from "@/components/ScheduleImage";
import MyInfo from "@/components/MyInfo";
import ResourcesSection from "@/components/ResourcesSection";
import GuidesSection from "@/components/GuidesSection";
import RescheduleControl from "@/components/RescheduleControl";
import SortableTh from "@/components/SortableTh";
import InvoicePaidControl from "@/components/InvoicePaidControl";
import { api, formatRate, useSort, GROUP_COLORS, todayDateStr } from "@/lib/client";
import { amountDueInOwnCurrency, rateById, batchesOf, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";

export default function StudentDashboard() {
  return <DashboardShell allowedType="Student">{(user) => <Body user={user} />}</DashboardShell>;
}

// TKT-0039: the payment link (a fixed-price Stripe Payment Link, not a
// per-amount Checkout Session — this app has no live Stripe API key, only
// this static checkout URL) can't actually charge the right amount for a
// given invoice. Tagging it with client_reference_id (the invoice this
// click was for) and prefilled_email at least lets a payment be matched
// back to the right invoice afterward, and saves retyping the email on
// Stripe's own page. Both are real Stripe Payment Link query parameters.
function stripePaymentLink(invoiceId, email) {
  const url = new URL(process.env.NEXT_PUBLIC_STRIPE_GATEWAY);
  url.searchParams.set("client_reference_id", invoiceId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("weekly");
  const [expandedAttendance, setExpandedAttendance] = useState(null);
  // TKT-0027: hide past schedule/attendance entries by default in the List
  // view (today's own sessions still show — they still need logging).
  const [showPastSchedule, setShowPastSchedule] = useState(false);

  async function load() {
    const bundle = await api(`/api/me?userId=${user.UserID}`);
    setData(bundle);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attendanceFor(scheduleId) {
    return data.attendanceItems.find((a) => a.ScheduleItemID === scheduleId);
  }

  async function logAttendance(scheduleItemId, status, loggedDuration) {
    setError("");
    try {
      const res = await api("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ scheduleItemId, userId: user.UserID, status, loggedDuration }),
      });
      setData((prev) => ({ ...prev, attendanceItems: [...prev.attendanceItems, res.attendanceItem] }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function setInvoicePaid(invoiceId, paid) {
    setError("");
    try {
      const res = await api("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({ invoiceId, studentPaidFlag: paid }),
      });
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.InvoiceID === res.invoice.InvoiceID ? res.invoice : i)),
      }));
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
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.InvoiceID === body.invoice.InvoiceID ? body.invoice : i)),
    }));
  }

  const todayStr = todayDateStr();
  const scheduleRows = (data?.scheduleItems || [])
    .filter((s) => showPastSchedule || s.Date >= todayStr)
    .map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const invoiceRows = (data?.invoices || [])
    .filter((i) => i.Status !== "Draft")
    .map((i) => ({ ...i, _period: i.Year * 100 + i.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const invSort = useSort(invoiceRows, "_period", "desc");
  // Attach the ONE Batch+rate this account is actually enrolled at (its own
  // BatchID/RateID) — a Service can offer several Batches/rates, but a user
  // should only ever see the one that applies to them, not every option
  // Management could pick from.
  const enrolledServices = (data?.enrollments || [])
    .map((e) => {
      const s = (data.services || []).find((s) => s.ServiceID === e.ServiceID);
      if (!s) return null;
      const batches = batchesOf(s);
      const myBatch = e.BatchID ? batches.find((b) => b.BatchID === e.BatchID) : batches[0];
      // A Staff-role Service (Role/Department, no Batches) keeps its
      // OccuranceList directly on the Service.
      const myOccurrences = batches.length > 0 ? myBatch?.OccuranceList || [] : s.OccuranceList || [];
      return { ...s, _myRate: rateById(s, e.BatchID, e.RateID), _myBatch: myBatch, _myOccurrences: myOccurrences };
    })
    .filter(Boolean);

  function serviceNameOf(id, batchId) {
    const s = (data?.services || []).find((s) => s.ServiceID === id);
    return s ? lineItemName(s, batchId) : "—";
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <MyInfo user={data.user} />

      <div className="card">
        <h2 className="font-semibold mb-4">My Enrollments</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th>
              <th>Rate</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {enrolledServices.map((s) => (
              <tr key={s.ServiceID}>
                <td>{s.Name}</td>
                <td>{s.Type}</td>
                <td>{formatRate(s._myRate)}</td>
                <td style={{ color: "var(--muted)" }}>
                  {(() => {
                    const scheduled = (s._myOccurrences || []).filter((o) => o.Day && o.Time);
                    return scheduled.length
                      ? scheduled.map((o) => `${o.Day} ${o.Time} (${o.Duration}h)${o.Facilitator ? ` · ${o.Facilitator}` : ""}`).join(", ")
                      : "Not scheduled yet";
                  })()}
                </td>
              </tr>
            ))}
            {enrolledServices.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  No enrollments yet — ask Management to enroll you in a Service.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ResourcesSection services={enrolledServices} />
      <GuidesSection guides={data.guides} />

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">My Schedule</h2>
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
          <label className="text-sm flex items-center gap-2 mb-3" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={showPastSchedule} onChange={(e) => setShowPastSchedule(e.target.checked)} />
            Show past
          </label>
        )}
        {view === "weekly" ? (
          <WeeklyOccurrences services={enrolledServices} />
        ) : view === "image" ? (
          <ScheduleImage userId={user.UserID} userName={user.Name} />
        ) : view === "calendar" ? (
          <ScheduleCalendar
            scheduleItems={data.scheduleItems}
            attendanceItems={data.attendanceItems}
            onLogAttendance={logAttendance}
            portalColor={GROUP_COLORS.Student}
            renderExpanded={(scheduleId, s) => (
              <SessionAttendance scheduleId={scheduleId} duration={s.Duration} viewerUserId={user.UserID} viewerType="Student" />
            )}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="_dt" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <th>Time</th>
                <SortableTh className="num" label="Hrs" sortKeyName="Duration" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <th>Instructor</th>
                <th>Attendance</th>
                <th>Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {schedSort.sorted.map((s) => {
                const att = attendanceFor(s.ScheduleID);
                const expanded = expandedAttendance === s.ScheduleID;
                return (
                  <Fragment key={s.ScheduleID}>
                    <tr>
                      <td>{s.ServiceName}</td>
                      <td>{formatDate(s.Date)}</td>
                      <td>{s.Time}</td>
                      <td className="num">{s.Duration}</td>
                      <td>{s.Facilitator || "—"}</td>
                      <td>
                        <button className="btn-ghost" onClick={() => setExpandedAttendance(expanded ? null : s.ScheduleID)}>
                          {att ? (
                            <span className={`badge badge-${att.Status === "Present" ? "good" : att.Status === "Late" ? "pending" : "bad"}`}>
                              {att.Status} · {att.LoggedDuration}h
                            </span>
                          ) : (
                            "Log…"
                          )}
                        </button>
                      </td>
                      <td>
                        <RescheduleControl
                          slot={s}
                          userId={user.UserID}
                          pendingRequest={(data.rescheduleRequests || []).find((r) => r.ScheduleItemID === s.ScheduleID)}
                          onSubmitted={load}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7}>
                          <SessionAttendance scheduleId={s.ScheduleID} duration={s.Duration} viewerUserId={user.UserID} viewerType="Student" />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {schedSort.sorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted)" }}>
                    {data.scheduleItems.length === 0
                      ? "No sessions yet — ask Management to enroll you in a Service."
                      : "No upcoming sessions — check \"Show past\" to see history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">My Invoices</h2>
        <table>
          <thead>
            <tr>
              <SortableTh label="Period" sortKeyName="_period" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
              <th>Service</th>
              <SortableTh className="num" label="Attended hrs" sortKeyName="AttendedHours" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
              <SortableTh className="num" label="Amount" sortKeyName="Amount" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
              <th className="num">Amount Due</th>
              <th className="num">Total Due ({data.user.Currency || "INR"})</th>
              <th>Paid</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invSort.sorted.map((i) => (
              <tr key={i.InvoiceID}>
                <td>
                  {i.Month}/{i.Year}
                  {/* TKT-0107: SentAt existed on the record already, never shown to the Student. */}
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
                <td className="num">{Array.isArray(i.LineItems) ? i.LineItems.reduce((sum, li) => sum + (Number(li.AttendedHours) || 0), 0) : i.AttendedHours}</td>
                <td className="num">{i.Currency || "INR"} {i.Amount}</td>
                <td className="num">{i.Currency || "INR"} {amountDueInOwnCurrency(i).toFixed(2)}</td>
                <td className="num">{i.ConvertedDue != null ? `${data.user.Currency || "INR"} ${i.ConvertedDue.toFixed(2)}` : "—"}</td>
                <td>
                  <InvoicePaidControl
                    invoice={i}
                    onMarkUnpaid={(id) => setInvoicePaid(id, false)}
                    onConfirmPaid={confirmPaid}
                  />
                </td>
                <td>
                  <span className="flex items-center gap-1 flex-wrap">
                    {process.env.NEXT_PUBLIC_STRIPE_GATEWAY && !i.StudentPaidFlag && (
                      <a
                        className="btn-ghost"
                        style={{ whiteSpace: "nowrap" }}
                        href={stripePaymentLink(i.InvoiceID, data.user.Email)}
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
              <tr>
                <td colSpan={8} style={{ color: "var(--muted)" }}>
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


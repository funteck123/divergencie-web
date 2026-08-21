"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import WeeklyOccurrences from "@/components/WeeklyOccurrences";
import MyInfo from "@/components/MyInfo";
import ResourcesSection from "@/components/ResourcesSection";
import GuidesSection from "@/components/GuidesSection";
import RescheduleControl from "@/components/RescheduleControl";
import SortableTh from "@/components/SortableTh";
import { api, formatRate, useSort, GROUP_COLORS, todayDateStr } from "@/lib/client";
import { amountDueInOwnCurrency, rateById, batchesOf, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";

// Ambassador accounts can be enrolled in Ambassador-group Services (see
// ALL_GROUPS in management/page.js) and are included in the bulk paycheck
// "generate" run same as Teacher/Staff.
export default function AmbassadorDashboard() {
  return <DashboardShell allowedType="Ambassador">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("weekly");
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
      await api("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ scheduleItemId, userId: user.UserID, status, loggedDuration }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function markPaycheckReceived(paycheckId) {
    setError("");
    try {
      await api("/api/paychecks", {
        method: "PATCH",
        body: JSON.stringify({ paycheckId, staffReceivedFlag: true }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const todayStr = todayDateStr();
  const scheduleRows = (data?.scheduleItems || [])
    .filter((s) => showPastSchedule || s.Date >= todayStr)
    .map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const paycheckRows = (data?.paychecks || [])
    .filter((p) => p.Status !== "Draft")
    .map((p) => ({ ...p, _period: p.Year * 100 + p.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const paySort = useSort(paycheckRows, "_period", "desc");
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
        ) : view === "calendar" ? (
          <ScheduleCalendar
            scheduleItems={data.scheduleItems}
            attendanceItems={data.attendanceItems}
            onLogAttendance={logAttendance}
            portalColor={GROUP_COLORS.Ambassador}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <SortableTh label="Service" sortKeyName="ServiceName" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <SortableTh label="Date" sortKeyName="_dt" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <th>Time</th>
                <SortableTh label="Hrs" sortKeyName="Duration" sortKey={schedSort.sortKey} sortDir={schedSort.sortDir} onSort={schedSort.toggleSort} />
                <th>Instructor</th>
                <th>Attendance</th>
                <th>Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {schedSort.sorted.map((s) => {
                const att = attendanceFor(s.ScheduleID);
                return (
                  <tr key={s.ScheduleID}>
                    <td>{s.ServiceName}</td>
                    <td>{formatDate(s.Date)}</td>
                    <td>{s.Time}</td>
                    <td>{s.Duration}</td>
                    <td>{s.Facilitator || "—"}</td>
                    <td>
                      {att ? (
                        <span className={`badge badge-${att.Status === "Present" ? "good" : att.Status === "Late" ? "pending" : "bad"}`}>
                          {att.Status} · {att.LoggedDuration}h
                        </span>
                      ) : (
                        <AttendanceForm defaultHrs={s.Duration} onSubmit={(status, hrs) => logAttendance(s.ScheduleID, status, hrs)} />
                      )}
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
        <h2 className="font-semibold mb-4">My Paychecks</h2>
        <table>
          <thead>
            <tr>
              <SortableTh label="Period" sortKeyName="_period" sortKey={paySort.sortKey} sortDir={paySort.sortDir} onSort={paySort.toggleSort} />
              <th>Service</th>
              <SortableTh label="Attended hrs" sortKeyName="AttendedHours" sortKey={paySort.sortKey} sortDir={paySort.sortDir} onSort={paySort.toggleSort} />
              <SortableTh label="Amount" sortKeyName="Amount" sortKey={paySort.sortKey} sortDir={paySort.sortDir} onSort={paySort.toggleSort} />
              <th>Amount Due</th>
              <th>Total Due ({data.user.Currency || "INR"})</th>
              <th>Received</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paySort.sorted.map((p) => (
              <tr key={p.PaycheckID}>
                <td>{p.Month}/{p.Year}</td>
                <td>
                  {Array.isArray(p.LineItems)
                    ? p.LineItems.map((li) => serviceNameOf(li.ServiceID, li.BatchID)).join(", ")
                    : serviceNameOf(p.ServiceID, p.BatchID)}
                </td>
                <td>{Array.isArray(p.LineItems) ? p.LineItems.reduce((sum, li) => sum + (Number(li.AttendedHours) || 0), 0) : p.AttendedHours}</td>
                <td>{p.Currency || "INR"} {p.Amount}</td>
                <td>{p.Currency || "INR"} {amountDueInOwnCurrency(p).toFixed(2)}</td>
                <td>{p.ConvertedDue != null ? `${data.user.Currency || "INR"} ${p.ConvertedDue.toFixed(2)}` : "—"}</td>
                <td>
                  {p.StaffReceivedFlag ? (
                    <span className="badge badge-good">Received ✓</span>
                  ) : (
                    <button className="btn-ghost" onClick={() => markPaycheckReceived(p.PaycheckID)}>
                      Mark as received
                    </button>
                  )}
                </td>
                <td>
                  <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/paychecks/pdf?paycheckId=${p.PaycheckID}`} download>
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {paySort.sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--muted)" }}>
                  No paychecks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceForm({ defaultHrs, onSubmit }) {
  const [status, setStatus] = useState("Present");
  const [hrs, setHrs] = useState(defaultHrs);
  return (
    <form
      className="flex gap-1 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(status, hrs);
      }}
    >
      <label className="text-xs" style={{ color: "var(--muted)" }}>
        Status
        <select className="field" style={{ width: 100, display: "block" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>Present</option>
          <option>Absent</option>
          <option>Late</option>
        </select>
      </label>
      <label className="text-xs" style={{ color: "var(--muted)" }}>
        Hours
        <input
          className="field"
          style={{ width: 60, display: "block" }}
          type="number"
          step="0.5"
          value={hrs}
          onChange={(e) => setHrs(e.target.value)}
        />
      </label>
      <button className="btn-ghost" type="submit">
        Log
      </button>
    </form>
  );
}

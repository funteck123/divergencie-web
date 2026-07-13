"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import WeeklyOccurrences from "@/components/WeeklyOccurrences";
import ScheduleImage from "@/components/ScheduleImage";
import MyInfo from "@/components/MyInfo";
import SortableTh from "@/components/SortableTh";
import { api, formatRates, useSort } from "@/lib/client";
import { amountDueInOwnCurrency } from "@/lib/billing";

export default function TeacherDashboard() {
  return <DashboardShell allowedType="Teacher">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("weekly");

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

  const scheduleRows = (data?.scheduleItems || []).map((s) => ({ ...s, _dt: s.Date + s.Time }));
  const paycheckRows = (data?.paychecks || [])
    .filter((p) => p.Status !== "Draft")
    .map((p) => ({ ...p, _period: p.Year * 100 + p.Month }));
  const schedSort = useSort(scheduleRows, "_dt");
  const paySort = useSort(paycheckRows, "_period", "desc");
  const enrolledServices = (data?.enrollments || [])
    .map((e) => (data.services || []).find((s) => s.ServiceID === e.ServiceID))
    .filter(Boolean);

  function serviceNameOf(id) {
    const s = (data?.services || []).find((s) => s.ServiceID === id);
    return s ? s.Name : "—";
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
                <td>{formatRates(s)}</td>
                <td style={{ color: "var(--muted)" }}>
                  {(s.OccuranceList || []).map((o) => `${o.Day} ${o.Time} (${o.Duration}h)${o.Facilitator ? ` · ${o.Facilitator}` : ""}`).join(", ") || "—"}
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
        {view === "weekly" ? (
          <WeeklyOccurrences services={enrolledServices} />
        ) : view === "image" ? (
          <ScheduleImage userId={user.UserID} userName={user.Name} />
        ) : view === "calendar" ? (
          <ScheduleCalendar
            scheduleItems={data.scheduleItems}
            attendanceItems={data.attendanceItems}
            onLogAttendance={logAttendance}
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
              </tr>
            </thead>
            <tbody>
              {schedSort.sorted.map((s) => {
                const att = attendanceFor(s.ScheduleID);
                return (
                  <tr key={s.ScheduleID}>
                    <td>{s.ServiceName}</td>
                    <td>{s.Date}</td>
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
                  </tr>
                );
              })}
              {schedSort.sorted.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No sessions yet — ask Management to enroll you in a Service.
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
              <th>Total ({data.user.Currency || "INR"})</th>
              <th>Received</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paySort.sorted.map((p) => (
              <tr key={p.PaycheckID}>
                <td>{p.Month}/{p.Year}</td>
                <td>{serviceNameOf(p.ServiceID)}</td>
                <td>{p.AttendedHours}</td>
                <td>{p.Currency || data.user.Currency || "INR"} {p.Amount}</td>
                <td>{p.Currency || data.user.Currency || "INR"} {amountDueInOwnCurrency(p, data.user.Currency).toFixed(2)}</td>
                <td>{p.ConvertedTotal != null ? `${data.user.Currency || "INR"} ${p.ConvertedTotal.toFixed(2)}` : "—"}</td>
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
      className="flex gap-1 items-center"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(status, hrs);
      }}
    >
      <select className="field" style={{ width: 100 }} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option>Present</option>
        <option>Absent</option>
        <option>Late</option>
      </select>
      <input
        className="field"
        style={{ width: 60 }}
        type="number"
        step="0.5"
        value={hrs}
        onChange={(e) => setHrs(e.target.value)}
      />
      <button className="btn-ghost" type="submit">
        Log
      </button>
    </form>
  );
}

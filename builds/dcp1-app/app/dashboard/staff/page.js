"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api } from "@/lib/client";

export default function StaffDashboard() {
  return <DashboardShell allowedType="Staff">{(user) => <Body user={user} />}</DashboardShell>;
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

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <div className="card">
        <h2 className="font-semibold mb-4">My Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Hrs</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {data.scheduleItems.map((s) => {
              const att = attendanceFor(s.ScheduleID);
              return (
                <tr key={s.ScheduleID}>
                  <td>{s.ServiceName}</td>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Duration}</td>
                  <td>
                    {att ? (
                      <span className="badge badge-good">{att.Status} · {att.LoggedDuration}h</span>
                    ) : (
                      <AttendanceForm defaultHrs={s.Duration} onSubmit={(status, hrs) => logAttendance(s.ScheduleID, status, hrs)} />
                    )}
                  </td>
                </tr>
              );
            })}
            {data.scheduleItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No sessions yet — ask Management to enroll you in a Service.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">My Paychecks</h2>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Attended hrs</th>
              <th>Amount</th>
              <th>INR Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.paychecks.map((p) => (
              <tr key={p.PaycheckID}>
                <td>{p.Month}/{p.Year}</td>
                <td>{p.AttendedHours}</td>
                <td>{p.Amount}</td>
                <td>{p.INRDue}</td>
                <td>
                  <span className={`badge ${p.Status === "Sent" ? "badge-good" : "badge-pending"}`}>{p.Status}</span>
                </td>
              </tr>
            ))}
            {data.paychecks.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
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

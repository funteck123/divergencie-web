"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { api, groupMatches } from "@/lib/client";

export default function TrialDashboard() {
  return <DashboardShell allowedType="TrialAcc">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scheduleById, setScheduleById] = useState({});
  const [serviceId, setServiceId] = useState("");

  async function load() {
    const bundle = await api(`/api/me?userId=${user.UserID}`);
    setData(bundle);
    const { scheduleItems } = await api("/api/schedule");
    const map = {};
    scheduleItems.forEach((s) => (map[s.ScheduleID] = s));
    setScheduleById(map);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function book(scheduleId) {
    setError("");
    try {
      await api("/api/schedule/pick", {
        method: "POST",
        body: JSON.stringify({ scheduleId, userId: user.UserID, type: "Trial" }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitFeedback(trialId, feedback) {
    await api("/api/trial-feedback", { method: "POST", body: JSON.stringify({ trialId, feedback }) });
    load();
  }

  async function payInvoice(invoiceId) {
    await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId, status: "Paid" }) });
    load();
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const myTrials = data.trialItems;
  const eligibleServices = data.services.filter((s) => groupMatches(s.Group, "Student"));
  const slotsForService = serviceId ? data.availableTrialSlots.filter((s) => s.ServiceID === serviceId) : [];

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <div className="card">
        <h2 className="font-semibold mb-4">My Trial Sessions</h2>
        {myTrials.length === 0 && <p style={{ color: "var(--muted)" }}>No sessions booked yet — pick a slot below.</p>}
        {myTrials.map((t) => {
          const slot = scheduleById[t.ScheduleItemID];
          return (
            <div key={t.TrialID} className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p>
                {slot ? `${slot.Date} at ${slot.Time} with ${slot.Facilitator}` : t.ScheduleItemID}{" "}
                <span className="badge badge-info">{t.Status}</span>
              </p>
              {t.Status === "Pending" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Awaiting Management approval.
                </p>
              )}
              {t.Status === "Rejected" && (
                <p className="text-sm mt-1" style={{ color: "var(--bad)" }}>
                  This request was rejected.
                </p>
              )}
              {t.Status === "Scheduled" && <FeedbackForm onSubmit={(fb) => submitFeedback(t.TrialID, fb)} />}
              {t.Status === "FeedbackSubmitted" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Feedback submitted: {t.Feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Available Trial Slots</h2>
        <select className="field mb-3" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Select a service…</option>
          {eligibleServices.map((s) => (
            <option key={s.ServiceID} value={s.ServiceID}>
              {s.Code ? `${s.Code} · ${s.Name}` : s.Name}
            </option>
          ))}
        </select>
        {serviceId && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Facilitator</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {slotsForService.map((s) => (
                <tr key={s.ScheduleID}>
                  <td>{s.Date}</td>
                  <td>{s.Time}</td>
                  <td>{s.Facilitator}</td>
                  <td>
                    <button className="btn" onClick={() => book(s.ScheduleID)}>
                      Book
                    </button>
                  </td>
                </tr>
              ))}
              {slotsForService.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    No open slots for this service right now — check back later.
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
              <th>Period</th>
              <th>Amount</th>
              <th>INR Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((i) => (
              <tr key={i.InvoiceID}>
                <td>{i.Month}/{i.Year}</td>
                <td>{i.Amount}</td>
                <td>{i.INRDue}</td>
                <td>
                  <span className={`badge ${i.Status === "Paid" ? "badge-good" : "badge-pending"}`}>{i.Status}</span>
                </td>
                <td>
                  {i.Status === "Sent" && (
                    <button className="btn" onClick={() => payInvoice(i.InvoiceID)}>
                      Mark as paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.invoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
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

function FeedbackForm({ onSubmit }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2 mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text);
      }}
    >
      <input className="field" placeholder="Leave feedback about your trial…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn" type="submit">
        Submit
      </button>
    </form>
  );
}

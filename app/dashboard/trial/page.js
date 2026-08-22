"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GuidesSection from "@/components/GuidesSection";
import { api, groupMatches } from "@/lib/client";
import { amountDueInOwnCurrency } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";

export default function TrialDashboard() {
  return <DashboardShell allowedType="TrialAcc">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scheduleById, setScheduleById] = useState({});
  const [serviceId, setServiceId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [busyInvoiceIds, setBusyInvoiceIds] = useState(new Set());

  async function load() {
    const [bundle, { scheduleItems }] = await Promise.all([
      api(`/api/me?userId=${user.UserID}`),
      api("/api/schedule"),
    ]);
    setData(bundle);
    const map = {};
    scheduleItems.forEach((s) => (map[s.ScheduleID] = s));
    setScheduleById(map);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TKT-0080: no slot picker — this just records the request against a
  // Service, same pattern as Interview (TKT-0021). Management assigns the
  // actual slot when approving it.
  async function requestTrial() {
    setError("");
    setRequesting(true);
    try {
      const res = await api("/api/schedule/pick", {
        method: "POST",
        body: JSON.stringify({ serviceId, userId: user.UserID, type: "Trial" }),
      });
      setServiceId("");
      setData((prev) => ({ ...prev, trialItems: [...prev.trialItems, res.trialItem] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setRequesting(false);
    }
  }

  async function submitFeedback(trialId, feedback) {
    const res = await api("/api/trial-feedback", { method: "POST", body: JSON.stringify({ trialId, feedback }) });
    setData((prev) => ({
      ...prev,
      trialItems: prev.trialItems.map((t) => (t.TrialID === trialId ? res.trialItem : t)),
    }));
  }

  async function payInvoice(invoiceId) {
    setBusyInvoiceIds((prev) => new Set(prev).add(invoiceId));
    try {
      const res = await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId, status: "Paid" }) });
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.InvoiceID === invoiceId ? res.invoice : i)),
      }));
    } finally {
      setBusyInvoiceIds((prev) => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const myTrials = data.trialItems;
  // TKT-0071: Book services shouldn't be trialable — a Trial is for
  // sampling a live class (Course), not a one-off resource purchase.
  const eligibleServices = data.services.filter((s) => groupMatches(s.Group, "Student") && s.Type !== "Book");
  const requestedServiceIds = new Set(
    myTrials.filter((t) => t.Status !== "Rejected").map((t) => t.ServiceID)
  );

  return (
    <div className="space-y-6">
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}

      <GuidesSection guides={data.guides} />

      <div className="card">
        <h2 className="font-semibold mb-4">My Trial Sessions</h2>
        {myTrials.length === 0 && <p style={{ color: "var(--muted)" }}>No trial requested yet — request one below.</p>}
        {myTrials.map((t) => {
          const slot = scheduleById[t.ScheduleItemID];
          return (
            <div key={t.TrialID} className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p>
                {/* TKT-0078: instructor identity isn't shown to the candidate
                    before their session (same reasoning as TKT-0018) —
                    batch name and timezone matter to them, who's teaching
                    doesn't. BatchName is only set on slots auto-generated
                    from a real Service occurrence; a manually-offered pool
                    slot has none, so it's simply omitted for those. */}
                {slot
                  ? `${formatDate(slot.Date)} at ${slot.Time} IST${slot.BatchName ? ` · Batch ${slot.BatchName}` : ""}`
                  : t.ScheduleItemID}{" "}
                <span className="badge badge-info">{t.Status}</span>
              </p>
              {t.Status === "Pending" && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Your booking is being reviewed.
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
        <h2 className="font-semibold mb-4">Request a Trial</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Pick the service you&apos;d like to trial. No need to choose a time. A slot will be assigned once your
          request is approved.
        </p>
        <div className="flex gap-3">
          <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select a service…</option>
            {eligibleServices.map((s) => (
              <option key={s.ServiceID} value={s.ServiceID} disabled={requestedServiceIds.has(s.ServiceID)}>
                {s.Code ? `${s.Code} · ${s.Name}` : s.Name}
                {requestedServiceIds.has(s.ServiceID) ? " (already requested)" : ""}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!serviceId || requesting} onClick={requestTrial}>
            {requesting ? "Requesting…" : "Request Trial"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">My Invoices</h2>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Amount</th>
              <th>Amount Due</th>
              <th>Total Due ({data.user.Currency || "INR"})</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((i) => (
              <tr key={i.InvoiceID}>
                <td>{i.Month}/{i.Year}</td>
                <td>{i.Currency || "INR"} {i.Amount}</td>
                <td>{i.Currency || "INR"} {amountDueInOwnCurrency(i).toFixed(2)}</td>
                <td>{i.ConvertedDue != null ? `${data.user.Currency || "INR"} ${i.ConvertedDue.toFixed(2)}` : "—"}</td>
                <td>
                  <span className={`badge ${i.Status === "Paid" ? "badge-good" : "badge-pending"}`}>{i.Status}</span>
                </td>
                <td>
                  {i.Status === "Sent" && (
                    <button
                      className="btn"
                      disabled={busyInvoiceIds.has(i.InvoiceID)}
                      onClick={() => payInvoice(i.InvoiceID)}
                    >
                      {busyInvoiceIds.has(i.InvoiceID) ? "Marking…" : "Mark as paid"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.invoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
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
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="flex gap-2 mt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSaving(true);
        try {
          await onSubmit(text);
        } finally {
          setSaving(false);
        }
      }}
    >
      <input className="field" placeholder="Leave feedback about your trial…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GuidesSection from "@/components/GuidesSection";
import InvoicePaidControl from "@/components/InvoicePaidControl";
import SortableTh from "@/components/SortableTh";
import FilterBar from "@/components/FilterBar";
import { api, groupMatches, useSort } from "@/lib/client";
import { amountDueInOwnCurrency } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";

// TKT-0126: Student and Parent dashboards both got a per-invoice Stripe
// "Pay online" link (TKT-0039); Trial never did, even though the Add
// Service flow (app/api/trial-enroll/route.js) bills a real invoice one
// month in advance the same way a regular enrollment does. No Email field
// on a TrialAcc account (unlike Student), so no prefilled_email -- same
// reasoning as the Parent dashboard's own version of this helper.
function stripePaymentLink(invoiceId) {
  const url = new URL(process.env.NEXT_PUBLIC_STRIPE_GATEWAY);
  url.searchParams.set("client_reference_id", invoiceId);
  return url.toString();
}

export default function TrialDashboard() {
  return <DashboardShell allowedType="TrialAcc">{(user) => <Body user={user} />}</DashboardShell>;
}

function Body({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scheduleById, setScheduleById] = useState({});
  const [serviceId, setServiceId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [invSearch, setInvSearch] = useState("");

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

  // TKT-0080: no slot picker, this just records the request against a
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

  // TKT-0091: this used to PATCH status: "Paid" directly, a Management-only
  // field -- the request was always rejected for a real Trial account, so
  // the invoice's Status could never actually change. Switched to the same
  // self-report-then-Management-confirms pattern already used by the
  // Student dashboard (studentPaidFlag + a payment-proof upload), the
  // established correct behavior per TKT-0089.
  async function setInvoicePaid(invoiceId, paid) {
    setError("");
    try {
      const res = await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ invoiceId, studentPaidFlag: paid }) });
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

  // TKT-0129/0130: this table had no search or sort at all. useSort must
  // run unconditionally (rules of hooks), before the `!data` guard below —
  // data?.invoices safely handles the not-yet-loaded case. Deliberately NOT
  // filtering out Status === "Draft" here (unlike Student/Teacher/Parent):
  // app/api/trial-enroll/route.js creates a Trial's own invoice with
  // Status "Draft" and nothing ever sends it, so filtering Draft the same
  // way as the other dashboards would hide every Trial invoice outright.
  const invoiceRows = (data?.invoices || [])
    .map((i) => ({ ...i, _period: i.Year * 100 + i.Month }))
    .filter((i) => {
      const q = invSearch.trim().toLowerCase();
      return !q || String(i.Month).includes(q) || String(i.Year).includes(q);
    });
  const invSort = useSort(invoiceRows, "_period", "desc");

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const myTrials = data.trialItems;
  // TKT-0071: Book services shouldn't be trialable, a Trial is for
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
        {myTrials.length === 0 && <p style={{ color: "var(--muted)" }}>No trial requested yet. Request one below.</p>}
        {myTrials.map((t) => {
          const slot = scheduleById[t.ScheduleItemID];
          return (
            <div key={t.TrialID} className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p>
                {/* TKT-0078: instructor identity isn't shown to the candidate
                    before their session (same reasoning as TKT-0018),
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
        <FilterBar search={invSearch} onSearch={setInvSearch} searchPlaceholder="Search month/year…" />
        <table>
          <thead>
            <tr>
              <SortableTh label="Period" sortKeyName="_period" sortKey={invSort.sortKey} sortDir={invSort.sortDir} onSort={invSort.toggleSort} />
              <th className="num">Amount</th>
              <th className="num">Amount Due</th>
              <th className="num">Total Due ({data.user.Currency || "INR"})</th>
              <th>Status</th>
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
                <td className="num">{i.Currency || "INR"} {i.Amount}</td>
                <td className="num">{i.Currency || "INR"} {amountDueInOwnCurrency(i).toFixed(2)}</td>
                <td className="num">{i.ConvertedDue != null ? `${data.user.Currency || "INR"} ${i.ConvertedDue.toFixed(2)}` : "—"}</td>
                <td>
                  <span className={`badge ${i.Status === "Sent" || i.Status === "Paid" ? "badge-good" : "badge-pending"}`}>{i.Status}</span>
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
                    {i.Status === "Sent" && (
                      <InvoicePaidControl
                        invoice={i}
                        onMarkUnpaid={(id) => setInvoicePaid(id, false)}
                        onConfirmPaid={confirmPaid}
                      />
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {invSort.sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  {data.invoices.length === 0 ? "No invoices yet." : "No matches."}
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

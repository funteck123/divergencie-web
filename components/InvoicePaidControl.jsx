"use client";

import { useState } from "react";
import { formatDate } from "@/lib/formatDate";

// Marking an invoice paid requires a payment-proof attachment (receipt,
// bank transfer screenshot, etc.), enforced here by disabling the confirm
// button until a file is chosen. "Mark as unpaid" needs no attachment.
export default function InvoicePaidControl({ invoice, onMarkUnpaid, onConfirmPaid }) {
  const [confirming, setConfirming] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (invoice.StudentPaidFlag) {
    return (
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="badge badge-good">Paid ✓</span>
          {invoice.PaymentProofPath && (
            <a className="btn-ghost" style={{ whiteSpace: "nowrap" }} href={`/api/invoices/proof?invoiceId=${invoice.InvoiceID}`} target="_blank" rel="noreferrer">
              View proof
            </a>
          )}
          <button className="btn-ghost" onClick={() => onMarkUnpaid(invoice.InvoiceID)}>
            Mark as unpaid
          </button>
        </span>
        {/* TKT-0107: PaidAt existed on the record already (added for
            Management's own Billing table in TKT-0033) but was never
            surfaced to the person who actually paid it. */}
        {invoice.PaidAt && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Paid {formatDate(invoice.PaidAt)}
          </span>
        )}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button className="btn-ghost" onClick={() => setConfirming(true)}>
        Mark as paid
      </button>
    );
  }

  // TKT-0090: a bare native file input ("Choose File" / "No file chosen",
  // raw browser-default text with no styling and no context) sat next to
  // a disabled "Confirm payment" button. It gave no real indication of
  // what was expected. The native input itself is still here for its real
  // file-picker behavior. It's just visually hidden now and triggered by
  // an actual labeled button instead of shown as-is. The chosen filename
  // (or an explicit "no file chosen yet" prompt, styled like the rest of
  // the app rather than the browser's own default wording) shows next to
  // it.
  const fileInputId = `payment-proof-${invoice.InvoiceID}`;
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-2">
        <label htmlFor={fileInputId} className="btn-ghost" style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
          Upload payment proof
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="image/*,application/pdf"
          style={{ width: 1, height: 1, opacity: 0, overflow: "hidden", position: "fixed", left: -9999 }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <span className="text-xs" style={{ color: file ? "var(--text-primary)" : "var(--muted)" }}>
          {file ? file.name : "Receipt or screenshot, none selected yet"}
        </span>
      </span>
      <button
        className="btn"
        disabled={!file || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onConfirmPaid(invoice.InvoiceID, file);
            setConfirming(false);
            setFile(null);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Uploading…" : "Confirm payment"}
      </button>
      <button
        className="btn-ghost"
        onClick={() => {
          setConfirming(false);
          setFile(null);
          setError("");
        }}
      >
        Cancel
      </button>
      {error && <span style={{ color: "var(--bad)", fontSize: "0.8em" }}>{error}</span>}
    </span>
  );
}

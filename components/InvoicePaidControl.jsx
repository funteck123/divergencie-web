"use client";

import { useState } from "react";

// Marking an invoice paid requires a payment-proof attachment (receipt,
// bank transfer screenshot, etc.) — enforced here by disabling the confirm
// button until a file is chosen; "mark as unpaid" needs no attachment.
export default function InvoicePaidControl({ invoice, onMarkUnpaid, onConfirmPaid }) {
  const [confirming, setConfirming] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (invoice.StudentPaidFlag) {
    return (
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
    );
  }

  if (!confirming) {
    return (
      <button className="btn-ghost" onClick={() => setConfirming(true)}>
        Mark as paid
      </button>
    );
  }

  // TKT-0090: a bare native file input with no label or context next to a
  // disabled "Confirm payment" button gave no indication of what file was
  // expected. A visible label plus a real placeholder-style hint fixes
  // that, same pattern as every other labeled form control in the app.
  const fileInputId = `payment-proof-${invoice.InvoiceID}`;
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="flex flex-col">
        <label htmlFor={fileInputId} className="text-xs" style={{ color: "var(--muted)" }}>
          Payment proof (receipt or screenshot)
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="image/*,application/pdf"
          style={{ maxWidth: 220, fontSize: "0.8em" }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
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

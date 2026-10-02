"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Field, TextInput } from "@/ui2/components/Field";
import { apiFetch } from "@/ui2/queries/client";
import type { BillRecord, RescheduleRequest, ScheduleItem } from "@/ui2/queries/types";
import "@/ui2/features/billing/billing.css";

/** A person asks for a session to move. Shows the move when it happened, the request while it waits, else the form. */
export function SuggestReschedule({ slot, userId, pending, onSubmitted }: { slot: ScheduleItem; userId: string; pending?: RescheduleRequest; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (slot.RescheduledDate) return <Badge kind="info">Rescheduled → {formatDate(slot.RescheduledDate) as string} {slot.RescheduledTime}</Badge>;
  if (pending) return <Badge kind="warning">Requested → {formatDate(pending.RequestedDate) as string} {pending.RequestedTime} (pending)</Badge>;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" variant="ghost">Suggest reschedule</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="u2-portal u2-approve" align="end" sideOffset={4}>
          <Field label="New date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="New time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <div className="u2-approve__row">
            <Button
              size="sm" variant="primary" loading={busy} disabled={!date || !time} disabledReason="Choose a date and a time."
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await apiFetch("/api/schedule/reschedule-requests", { method: "POST", body: { scheduleId: slot.ScheduleID, userId, requestedDate: date, requestedTime: time } });
                  toast.success("Request sent.");
                  setOpen(false);
                  onSubmitted();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not send.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {error && <p role="alert" className="u2-form__error">{error}</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Paying an invoice: mark it paid by uploading proof (a receipt or screenshot), or take the mark back. An invoice that is
 * already marked paid shows the badge, the proof link and the paid date.
 */
export function InvoicePaid({ invoice, onMarkUnpaid, onConfirmPaid }: { invoice: BillRecord; onMarkUnpaid: (id: string) => Promise<void>; onConfirmPaid: (id: string, file: File) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = String(invoice.InvoiceID);
  const fileId = `payment-proof-${id}`;

  if (invoice.StudentPaidFlag)
    return (
      <span className="u2-rows" style={{ gap: 2 }}>
        <span className="u2-rowactions" style={{ flexWrap: "wrap" }}>
          <Badge kind="success">Paid ✓</Badge>
          {invoice.PaymentProofPath && <a href={`/api/invoices/proof?invoiceId=${id}`} target="_blank" rel="noreferrer">View proof</a>}
          <Button size="sm" variant="ghost" onClick={() => void onMarkUnpaid(id)}>Mark as unpaid</Button>
        </span>
        {invoice.PaidAt && <span className="u2-muted">Paid {formatDate(invoice.PaidAt) as string}</span>}
      </span>
    );
  if (!confirming) return <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Mark as paid</Button>;
  return (
    <span className="u2-rowactions" style={{ flexWrap: "wrap" }}>
      <label htmlFor={fileId} className="u2-pill" style={{ cursor: "pointer" }}>Upload payment proof</label>
      <input id={fileId} type="file" accept="image/*,application/pdf" className="u2-visually-hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <span className="u2-muted" aria-live="polite">{file ? file.name : "Receipt or screenshot, none selected yet"}</span>
      <Button
        size="sm" variant="primary" loading={busy} disabled={!file} disabledReason="Choose the proof first."
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onConfirmPaid(id, file as File);
            setConfirming(false);
            setFile(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not confirm.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Confirm payment
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setFile(null); setError(""); }}>Cancel</Button>
      {error && <span role="alert" className="u2-form__error">{error}</span>}
    </span>
  );
}

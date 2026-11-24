"use client";

import { toast } from "sonner";
import type { RowMenuItem } from "@/ui2/components/RowMenu";
import { copyToClipboard } from "@/ui2/lib/clipboard";
import { apiFetch } from "@/ui2/queries/client";
import type { BillRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { buildAcknowledgedMessage, buildReminderMessage, paymentSectionFor, type PaymentOption } from "./billingLogic";

/**
 * Menu items that copy the fee reminder (one per payment method, using the bill's currency section), or the
 * acknowledgement for a settled invoice. A method with no text yet is shown disabled with the reason.
 */
export function copyItems(row: BillRecord, student: UserRecord | undefined, services: readonly ServiceRecord[], options: readonly PaymentOption[] | undefined, settled: boolean): RowMenuItem[] {
  if (settled)
    return [{ label: "Copy acknowledgement", onSelect: () => void copy(buildAcknowledgedMessage(row, student, services), "Acknowledgement copied.") }];
  if (!options) return [{ label: "Copy reminder (loading methods…)", disabled: true, disabledReason: "Loading the payment methods." }];
  return options.map((opt) => ({
    label: `Copy reminder: ${opt.label}`,
    disabled: !opt.text,
    disabledReason: "Details not set up yet.",
    onSelect: () => void copyReminder(row, student, services, opt, `Reminder copied (${opt.label}).`),
  }));
}

/** The fee reminder with a link that opens the invoice PDF without a login (made by the server, tied to this one invoice, expires). If the server cannot make one, the old portal link is used. */
async function copyReminder(row: BillRecord, student: UserRecord | undefined, services: readonly ServiceRecord[], opt: PaymentOption, done: string) {
  let link: string | undefined;
  try {
    link = (await apiFetch<{ url: string }>("/api/invoices/share", { method: "POST", body: { invoiceId: row.InvoiceID } })).url;
  } catch {
    link = undefined;
  }
  await copy(buildReminderMessage(row, student, services, paymentSectionFor(opt, row.Currency), window.location.origin, new Date(), link), done);
}

async function copy(text: string, done: string) {
  try {
    await copyToClipboard(text);
    toast.success(done);
  } catch {
    toast.error("Could not copy. Try again.");
  }
}

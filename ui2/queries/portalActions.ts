"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

/** Payment actions of the person's own bills. Each reloads the person's bundle, because totals and flags change server side. */
export function useBillActions(userId: string) {
  const qc = useQueryClient();
  const reload = () => qc.invalidateQueries({ queryKey: ["me", userId] });
  return {
    markUnpaid: async (invoiceId: string) => {
      await apiFetch("/api/invoices", { method: "PATCH", body: { invoiceId, studentPaidFlag: false } });
      await reload();
    },
    /** Multipart upload: the browser sets the boundary itself, so no JSON header (same rule as the classic client). */
    confirmPaid: async (invoiceId: string, file: File) => {
      const form = new FormData();
      form.append("invoiceId", invoiceId);
      form.append("file", file);
      await apiFetch("/api/invoices/mark-paid", { method: "POST", body: form });
      await reload();
    },
    markReceived: async (paycheckId: string) => {
      await apiFetch("/api/paychecks", { method: "PATCH", body: { paycheckId, staffReceivedFlag: true } });
      await reload();
    },
  };
}

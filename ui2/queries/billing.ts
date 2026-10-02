"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { BillRecord } from "./types";
import { KINDS, type BillKind, type PaymentOption } from "@/ui2/features/billing/billingLogic";

const keyOf = (kind: BillKind) => (kind === "invoice" ? keys.invoices : keys.paychecks);
const listKey = (kind: BillKind) => (kind === "invoice" ? "invoices" : "paychecks");

export function useBills(kind: BillKind) {
  return useQuery({
    queryKey: keyOf(kind),
    queryFn: async () => (await apiFetch<Record<string, BillRecord[]>>(KINDS[kind].endpoint))[listKey(kind)] ?? [],
  });
}

/** Replace one bill in the cache with the server's reply (the server recomputes totals, so never patch locally). */
export function usePatchBill(kind: BillKind) {
  const qc = useQueryClient();
  const k = KINDS[kind];
  return useMutation({
    mutationFn: async ({ id, patch, lineItemIndex }: { id: string; patch: Record<string, unknown>; lineItemIndex?: number }) => {
      const body = { [k.bodyIdKey]: id, ...(lineItemIndex !== undefined ? { lineItemIndex } : {}), ...patch };
      return (await apiFetch<Record<string, BillRecord>>(k.endpoint, { method: "PATCH", body }))[k.responseKey] as BillRecord;
    },
    onSuccess: (bill, { id }) => {
      qc.setQueryData<BillRecord[]>(keyOf(kind), (rows) => rows?.map((r) => (r[k.idKey] === id ? bill : r)));
    },
  });
}

export function useDeleteBill(kind: BillKind) {
  const qc = useQueryClient();
  const k = KINDS[kind];
  return useMutation({
    mutationFn: (id: string) => apiFetch(k.endpoint, { method: "DELETE", body: { [k.bodyIdKey]: id } }),
    onSuccess: (_r, id) => {
      qc.setQueryData<BillRecord[]>(keyOf(kind), (rows) => rows?.filter((r) => r[k.idKey] !== id));
    },
  });
}

export interface GenerateOutcome {
  invoices: { created?: unknown[]; skipped?: { studentId?: string; staffId?: string; serviceId?: string }[] };
  paychecks: { created?: unknown[]; skipped?: { studentId?: string; staffId?: string; serviceId?: string }[] };
}

/** Monthly run: drafts for invoices and paychecks together, as the classic Generate Drafts button does. */
export function useGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }): Promise<GenerateOutcome> => {
      const [invoices, paychecks] = await Promise.all([
        apiFetch<GenerateOutcome["invoices"]>("/api/invoices", { method: "POST", body: { action: "generate", year, month } }),
        apiFetch<GenerateOutcome["paychecks"]>("/api/paychecks", { method: "POST", body: { action: "generate", year, month } }),
      ]);
      return { invoices, paychecks };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.invoices });
      void qc.invalidateQueries({ queryKey: keys.paychecks });
    },
  });
}

/** Delete and regenerate the DRAFT bills of chosen people for a month (never touches a Sent one). */
export function useRebuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month, studentIds, staffIds }: { year: number; month: number; studentIds: string[]; staffIds: string[] }) => {
      const [invoiceRes, paycheckRes] = await Promise.all([
        studentIds.length > 0 ? apiFetch<{ created?: unknown[] }>("/api/invoices", { method: "POST", body: { action: "generate", year, month, onlyStudentIds: studentIds, rebuild: true } }) : null,
        staffIds.length > 0 ? apiFetch<{ created?: unknown[] }>("/api/paychecks", { method: "POST", body: { action: "generate", year, month, onlyStaffIds: staffIds, rebuild: true } }) : null,
      ]);
      return { invoiceRes, paycheckRes };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.invoices });
      void qc.invalidateQueries({ queryKey: keys.paychecks });
    },
  });
}

export function useManualInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { personId: string; year: number; month: number; rows: { serviceId: string; amount: number }[] }) =>
      apiFetch<{ invoices: BillRecord[] }>("/api/invoices", { method: "POST", body: { action: "manual", studentId: v.personId, year: v.year, month: v.month, lineItems: v.rows } }),
    onSuccess: (res) => qc.setQueryData<BillRecord[]>(keys.invoices, (rows) => [...(rows ?? []), ...res.invoices]),
  });
}

export function useManualPaycheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { personId: string; serviceId: string; year: number; month: number; amount: number }) =>
      apiFetch<{ paycheck: BillRecord }>("/api/paychecks", { method: "POST", body: { action: "manual", staffId: v.personId, serviceId: v.serviceId, year: v.year, month: v.month, amount: v.amount } }),
    onSuccess: (res) => qc.setQueryData<BillRecord[]>(keys.paychecks, (rows) => [...(rows ?? []), res.paycheck]),
  });
}

/** Payment instructions per method, cached for the session (the classic page keeps one promise for the same reason). */
export function usePaymentOptions() {
  return useQuery({
    queryKey: ["payment-details"] as const,
    staleTime: 10 * 60_000,
    queryFn: async () => (await apiFetch<{ options: PaymentOption[] }>("/api/payment-details")).options,
  });
}

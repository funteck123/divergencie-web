"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { TicketRecord } from "./types";

export function useTickets() {
  return useQuery({ queryKey: keys.tickets, queryFn: async () => (await apiFetch<{ tickets: TicketRecord[] }>("/api/tickets")).tickets });
}

export type TicketAction = "close" | "reopen" | "edit" | "hold" | "unhold" | "note";

/** One ticket change (close, reopen, edit, hold, unhold, note). The reply is the whole ticket and replaces the cached one. */
export function usePatchTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, action, extra }: { ticketId: string; action: TicketAction; extra?: Record<string, unknown> }) =>
      (await apiFetch<{ ticket: TicketRecord }>("/api/tickets", { method: "PATCH", body: { ticketId, action, ...extra } })).ticket,
    onSuccess: (ticket) => qc.setQueryData<TicketRecord[]>(keys.tickets, (rows) => rows?.map((t) => (t.TicketID === ticket.TicketID ? ticket : t))),
  });
}

export interface UptimeResult {
  name: string;
  up: boolean;
  reason?: string;
}
export function useUptimeCheck() {
  return useMutation({ mutationFn: () => apiFetch<{ results: UptimeResult[]; checkedAt: string }>("/api/admin/service-uptime") });
}

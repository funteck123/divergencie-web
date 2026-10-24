"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiList } from "./client";
import { keys } from "./keys";
import type { MyTicket, TicketRecord } from "./types";

export function useTickets() {
  return useQuery({ queryKey: keys.tickets, queryFn: async () => await apiList<TicketRecord>("/api/tickets", "tickets") });
}

/** The signed-in person's own tickets (GET /api/tickets?mine=1), newest first, with the replies on them. Loaded only while the screen is open. */
export function useMyTickets(enabled: boolean) {
  return useQuery({ queryKey: keys.myTickets, enabled, queryFn: async () => await apiList<MyTicket>("/api/tickets?mine=1", "tickets") });
}

/** Add a reply that both the sender and Management can read (POST /api/tickets with ticketId and reply). */
export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, reply }: { ticketId: string; reply: string }) => (await apiFetch<{ ticket: TicketRecord }>("/api/tickets", { method: "POST", body: { ticketId, reply } })).ticket,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.myTickets });
      void qc.invalidateQueries({ queryKey: keys.tickets });
    },
  });
}

/** A link to one ticket's picture that works for 5 minutes. */
export async function fetchTicketImageUrl(ticketId: string): Promise<string> {
  return (await apiFetch<{ url: string }>(`/api/tickets?image=${encodeURIComponent(ticketId)}`)).url;
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

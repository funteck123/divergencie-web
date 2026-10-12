import type { TicketRecord, UserRecord } from "@/ui2/queries/types";

export interface TicketFilters {
  showClosed: boolean;
  showOnHold: boolean;
  search: string;
}

export const senderLabel = (users: readonly UserRecord[], id: string) => {
  const u = users.find((x) => x.UserID === id);
  return u ? `${u.Name} (${u.UserType})` : id;
};

/** Same rules as the classic list: closed hidden unless asked, on hold hidden unless asked, newest first. */
export function visibleTickets(tickets: readonly TicketRecord[], f: TicketFilters, label: (id: string) => string): TicketRecord[] {
  const needle = f.search.trim().toLowerCase();
  return tickets
    .filter((t) => f.showClosed || !t.ClosedAt)
    .filter((t) => f.showOnHold || t.ClosedAt || !t.OnHold)
    .filter((t) => !needle || label(t.SenderUserID).toLowerCase().includes(needle) || t.Message.toLowerCase().includes(needle))
    .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
}

export const openCount = (tickets: readonly TicketRecord[]) => tickets.filter((t) => !t.ClosedAt && !t.OnHold).length;
export const onHoldCount = (tickets: readonly TicketRecord[]) => tickets.filter((t) => !t.ClosedAt && t.OnHold).length;

/** Whole days a ticket has been open: from creation to now, or to the day it was closed. */
export function ticketAgeDays(t: Pick<TicketRecord, "CreatedAt" | "ClosedAt">, now = Date.now()): number {
  const start = Date.parse(t.CreatedAt);
  if (Number.isNaN(start)) return 0;
  const end = t.ClosedAt ? Date.parse(t.ClosedAt) : now;
  return Math.max(0, Math.floor(((Number.isNaN(end) ? now : end) - start) / 86_400_000));
}
export const ageLabel = (days: number) => (days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`);

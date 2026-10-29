import type { LeadRecord, PendingRequest, RegForm, RescheduleRequest, TicketRecord } from "@/ui2/queries/types";

export type NotificationKind = "inquiry" | "application" | "request" | "reschedule" | "ticket";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  /** ISO time the item started waiting. Empty when the record keeps no time. */
  at: string;
  /** The new-UI page where Management acts on it. */
  href: string;
}

export const KIND_LABEL: Record<NotificationKind, string> = {
  inquiry: "New inquiries",
  application: "Applications to review",
  request: "Trial and interview requests",
  reschedule: "Reschedule requests",
  ticket: "Tickets waiting for a reply",
};

export interface NotificationInput {
  leads: readonly LeadRecord[];
  regForms: readonly RegForm[];
  pendingTrials: readonly PendingRequest[];
  pendingInterviews: readonly PendingRequest[];
  rescheduleRequests: readonly RescheduleRequest[];
  tickets: readonly TicketRecord[];
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const time = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? -1 : t; };

/** A ticket needs Management when it is open, not on hold, and the last word is not Management's. */
export function ticketNeedsReply(t: TicketRecord): boolean {
  if (t.ClosedAt || t.OnHold) return false;
  const last = t.Replies?.[t.Replies.length - 1];
  return !last || last.ByType !== "Management";
}

/** Everything that waits for Management, newest first. Items without a time come last. Read only: no sends, no changes. */
export function buildNotifications(i: NotificationInput): NotificationItem[] {
  const items: NotificationItem[] = [
    ...i.leads.filter((l) => !(l as { Status?: string }).Status || (l as { Status?: string }).Status === "new").map((l): NotificationItem => ({
      id: `lead:${l.LeadID}`, kind: "inquiry", title: l.Name, detail: [l.Country, l.Notes && clip(l.Notes.replace(/\s+/g, " "))].filter(Boolean).join(" · ") || l.Email, at: l.CreatedAt, href: "/v2/management/pipeline",
    })),
    ...i.regForms.filter((r) => r.Status === "Pending").map((r): NotificationItem => ({
      id: `reg:${r.RegFormID}`, kind: "application", title: r.Name, detail: `Applied as ${r.RequestedType}`, at: typeof r.CreatedAt === "string" ? r.CreatedAt : "", href: "/v2/management/applications",
    })),
    ...i.pendingTrials.map((p): NotificationItem => ({
      id: `trial:${p.TrialID ?? p.ServiceID + p.RequesterName}`, kind: "request", title: p.RequesterName, detail: "Asked for a trial class", at: typeof p.CreatedAt === "string" ? p.CreatedAt : "", href: "/v2/management/schedule",
    })),
    ...i.pendingInterviews.map((p): NotificationItem => ({
      id: `interview:${p.InterviewID ?? p.ServiceID + p.RequesterName}`, kind: "request", title: p.RequesterName, detail: "Asked for an interview", at: typeof p.CreatedAt === "string" ? p.CreatedAt : "", href: "/v2/management/schedule",
    })),
    ...i.rescheduleRequests.map((r): NotificationItem => ({
      id: `resched:${r.RescheduleRequestID}`, kind: "reschedule", title: r.RequesterName, detail: `Wants ${r.RequestedDate} at ${r.RequestedTime}`, at: "", href: "/v2/management/schedule",
    })),
    ...i.tickets.filter(ticketNeedsReply).map((t): NotificationItem => ({
      id: `ticket:${t.TicketID}`, kind: "ticket", title: t.TicketID, detail: clip(t.Message.replace(/\s+/g, " ")), at: t.CreatedAt, href: "/v2/management/tickets",
    })),
  ];
  return items.sort((a, b) => time(b.at) - time(a.at) || a.id.localeCompare(b.id));
}

export function countByKind(items: readonly NotificationItem[]): Record<NotificationKind, number> {
  const out: Record<NotificationKind, number> = { inquiry: 0, application: 0, request: 0, reschedule: 0, ticket: 0 };
  for (const x of items) out[x.kind] += 1;
  return out;
}

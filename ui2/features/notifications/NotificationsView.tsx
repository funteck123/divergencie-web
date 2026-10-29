"use client";

import Link from "next/link";
import { Badge } from "@/ui2/components/Badge";
import { LinkButton } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Skeleton } from "@/ui2/components/Skeleton";
import { useLeads, usePendingRequests, useRegForms } from "@/ui2/queries/pipeline";
import { useRescheduleRequests } from "@/ui2/queries/schedule";
import { useTickets } from "@/ui2/queries/tickets";
import { KIND_LABEL, buildNotifications, countByKind, type NotificationItem, type NotificationKind } from "./notificationsLogic";
import "./notifications.css";

const KINDS = Object.keys(KIND_LABEL) as NotificationKind[];
const when = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };

const columns: Column<NotificationItem>[] = [
  { id: "kind", header: "Type", width: 190, sortValue: (n) => KIND_LABEL[n.kind], cell: (n) => <Badge kind={n.kind === "ticket" ? "warning" : "info"}>{KIND_LABEL[n.kind]}</Badge> },
  { id: "title", header: "Who", width: 180, sortValue: (n) => n.title, cell: (n) => n.title },
  { id: "detail", header: "What", tip: (n) => n.detail, cell: (n) => n.detail },
  { id: "at", header: "Since", width: 120, sortValue: (n) => n.at, cell: (n) => (n.at ? when(n.at) : "—") },
  { id: "open", header: "", width: 90, cell: (n) => <LinkButton href={n.href}>Open</LinkButton> },
];

/** What waits for Management right now, from data the portal already loads. Read only: it sends nothing. */
export function NotificationsView() {
  const leads = useLeads(), regs = useRegForms(), pending = usePendingRequests(), resched = useRescheduleRequests(), tickets = useTickets();
  const failed = [leads, regs, pending, resched, tickets].find((q) => q.error);
  if (failed?.error) return <p role="alert" className="u2-errorbox">Could not load the notifications: {failed.error.message}</p>;
  if (!leads.data || !regs.data || !pending.data || !resched.data || !tickets.data) return <Skeleton height={160} />;
  const items = buildNotifications({
    leads: leads.data, regForms: regs.data, pendingTrials: pending.data.pendingTrials ?? [], pendingInterviews: pending.data.pendingInterviews ?? [],
    rescheduleRequests: resched.data, tickets: tickets.data,
  });
  const counts = countByKind(items);
  return (
    <section className="u2-notes">
      <h1>Notifications</h1>
      <p className="u2-muted">Everything that waits for Management. It updates when you open the page. Nothing is sent from here.</p>
      <ul className="u2-notes__chips" aria-label="Waiting by type">
        {KINDS.map((k) => (
          <li key={k} className="u2-notes__chip"><strong>{counts[k]}</strong> {KIND_LABEL[k]}</li>
        ))}
      </ul>
      <DataTable rows={items} columns={columns} rowKey={(n) => n.id} caption="Waiting for Management" emptyText="Nothing is waiting. All caught up." card={(n) => (
        <div className="u2-notes__card">
          <Badge kind={n.kind === "ticket" ? "warning" : "info"}>{KIND_LABEL[n.kind]}</Badge>
          <strong>{n.title}</strong>
          <span>{n.detail}</span>
          <span className="u2-muted">Since {n.at ? when(n.at) : "—"}</span>
          <Link href={n.href}>Open</Link>
        </div>
      )} />
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { amountDueInOwnCurrency } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import type { BillRecord, ServiceRecord } from "@/ui2/queries/types";
import { InvoicePaid } from "./Controls";
import { Card } from "./Cards";
import { attendedHours, billPeriod, billServiceNames, stripeLink, visibleBills } from "./portalLogic";
import "./portal.css";

export interface BillsCardProps {
  kind: "invoice" | "paycheck";
  title: string;
  bills: readonly BillRecord[] | undefined;
  services: readonly ServiceRecord[];
  currency: string;
  email?: string;
  /** Trial candidates see a shorter table (status badge, no hours, no service list). */
  compact?: boolean;
  onMarkUnpaid?: (id: string) => Promise<void>;
  onConfirmPaid?: (id: string, file: File) => Promise<void>;
  onMarkReceived?: (id: string) => Promise<void>;
  searchHint?: string;
}

/** The person's own invoices (pay online, proof of payment, PDF) or paychecks (mark received, PDF). Drafts are never shown. */
export function BillsCard({ kind, title, bills, services, currency, email, compact, onMarkUnpaid, onConfirmPaid, onMarkReceived }: BillsCardProps) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const gateway = process.env.NEXT_PUBLIC_STRIPE_GATEWAY;
  const all = useMemo(() => visibleBills(kind === "paycheck" ? bills : bills?.filter(() => true)), [bills, kind]);
  const shown = useMemo(() => (compact ? (bills ?? []) : all), [compact, bills, all]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shown.filter((b) => !needle || (compact ? String(b.Month).includes(needle) || String(b.Year).includes(needle) : billServiceNames(b, services).some((n) => n.toLowerCase().includes(needle))));
  }, [shown, q, services, compact]);
  const idOf = (b: BillRecord) => String(kind === "invoice" ? b.InvoiceID : b.PaycheckID);
  const flag = kind === "invoice" ? "StudentPaidFlag" : "StaffReceivedFlag";

  const cols: Column<BillRecord>[] = [
    { id: "period", header: "Period", width: 110, sortValue: (b) => billPeriod(b), cell: (b) => <>{b.Month}/{b.Year}{b.SentAt && <span className="u2-sub">Sent {formatDate(b.SentAt) as string}</span>}</> },
    ...(compact ? [] : ([{ id: "service", header: "Service", tip: (b: BillRecord) => billServiceNames(b, services).join(", "), cell: (b: BillRecord) => billServiceNames(b, services).join(", ") }, { id: "hours", header: "Attended hrs", width: 90, numeric: true, sortValue: (b: BillRecord) => attendedHours(b), cell: (b: BillRecord) => attendedHours(b) }] satisfies Column<BillRecord>[])),
    { id: "amount", header: "Amount", width: 110, numeric: true, sortValue: (b) => Number(b.Amount), cell: (b) => `${b.Currency || "INR"} ${b.Amount}` },
    { id: "due", header: "Amount Due", width: 110, numeric: true, cell: (b) => `${b.Currency || "INR"} ${(amountDueInOwnCurrency(b) as number).toFixed(2)}` },
    { id: "total", header: `Total Due (${currency})`, width: 130, numeric: true, cell: (b) => (b.ConvertedDue != null ? `${currency} ${Number(b.ConvertedDue).toFixed(2)}` : "—") },
    ...(compact
      ? ([{ id: "status", header: "Status", width: 80, cell: (b: BillRecord) => <Badge kind={b.Status === "Sent" || b.Status === "Paid" ? "success" : "neutral"}>{b.Status}</Badge> }] satisfies Column<BillRecord>[])
      : ([{
          id: "paid", header: kind === "invoice" ? "Paid" : "Received", width: kind === "invoice" ? 300 : 150,
          cell: (b: BillRecord) =>
            kind === "invoice" ? (
              <InvoicePaid invoice={b} onMarkUnpaid={onMarkUnpaid!} onConfirmPaid={onConfirmPaid!} />
            ) : (b as Record<string, unknown>)[flag] ? (
              <span className="u2-rows" style={{ gap: 2 }}><Badge kind="success">Received ✓</Badge>{b.ReceivedAt && <span className="u2-muted">{formatDate(b.ReceivedAt) as string}</span>}</span>
            ) : (
              <Button size="sm" variant="ghost" loading={busy === idOf(b)} onClick={async () => { setBusy(idOf(b)); try { await onMarkReceived!(idOf(b)); } finally { setBusy(null); } }}>Mark as received</Button>
            ),
        }] satisfies Column<BillRecord>[])),
    {
      id: "actions", header: "", title: "Actions", width: compact ? 260 : 150,
      cell: (b) => {
        const pay = kind === "invoice" && !(b as Record<string, unknown>)[flag] ? stripeLink(gateway, idOf(b), email) : null;
        return (
          <span className="u2-rowactions">
            {pay && <a className="u2-pill" href={pay} target="_blank" rel="noreferrer">Pay online</a>}
            {compact && b.Status === "Sent" && <InvoicePaid invoice={b} onMarkUnpaid={onMarkUnpaid!} onConfirmPaid={onConfirmPaid!} />}
            {!compact && <LinkButton href={kind === "invoice" ? `/api/invoices/pdf?invoiceId=${idOf(b)}` : `/api/paychecks/pdf?paycheckId=${idOf(b)}`} download>PDF</LinkButton>}
          </span>
        );
      },
    },
  ];
  return (
    <Card title={title}>
      <input type="search" className="u2-search" placeholder={compact ? "Search month or year…" : "Search service…"} aria-label={`Search ${title}`} value={q} onChange={(e) => setQ(e.target.value)} />
      <DataTable caption={title} rows={rows} columns={cols} rowKey={idOf} initialSort={{ id: "period", dir: "desc" }} emptyText={shown.length === 0 ? `No ${kind}s yet.` : "No matches."} />
    </Card>
  );
}

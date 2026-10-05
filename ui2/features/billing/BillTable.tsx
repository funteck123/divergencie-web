"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { amountDueInOwnCurrency, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";
import { discountBreakdown } from "@/lib/invoiceDiscount";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { Field, TextInput } from "@/ui2/components/Field";
import { Combobox } from "@/ui2/components/Combobox";
import { RowMenu, type RowMenuItem } from "@/ui2/components/RowMenu";
import { useBills, useDeleteBill, usePatchBill, usePaymentOptions } from "@/ui2/queries/billing";
import type { BillRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { ApprovePayment } from "./ApprovePayment";
import { BillSheet } from "./BillSheet";
import { copyItems } from "./billActions";
import {
  KINDS, LANES, MODE_LABEL, STATUS_FILTER_LABEL, activeFilterCount, applyFilters, duplicateMonths, emptyFilters, fxRateTitle, groupBills, isSettled, laneOf, needsApproval, periodKey, personSummary,
  type BillFilters, type BillKind, type Mode, type StatusFilter,
} from "./billingLogic";
import "./billing.css";
import "@/ui2/features/accounts/accounts.css";

const MODES = Object.keys(MODE_LABEL) as Mode[];

export function BillTable({ kind, users, services }: { kind: BillKind; users: readonly UserRecord[]; services: readonly ServiceRecord[] }) {
  const k = KINDS[kind];
  const { data, isPending, error, refetch } = useBills(kind);
  const patch = usePatchBill(kind);
  const del = useDeleteBill(kind);
  const options = usePaymentOptions();
  const [modeParam, setMode] = useQueryState(`${kind}Mode`, parseAsString.withDefault("table"));
  const mode: Mode = (MODES as string[]).includes(modeParam) ? (modeParam as Mode) : "table";
  const [q, setQ] = useQueryState(`${kind}Q`, parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState(`${kind}Status`, parseAsString.withDefault("all"));
  const [filters, setFilters] = useState<BillFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillRecord | null>(null);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const deferredQ = useDeferredValue(q);

  const all = useMemo(() => data ?? [], [data]);
  const userById = useMemo(() => new Map(users.map((u) => [u.UserID, u])), [users]);
  const nameOf = (id: string) => userById.get(id)?.Name || id;
  const f: BillFilters = useMemo(() => ({ ...filters, search: deferredQ, status: (status in STATUS_FILTER_LABEL ? status : "all") as StatusFilter }), [filters, deferredQ, status]);
  const rows = useMemo(() => applyFilters(all, f, k, nameOf), [all, f, k, users]); // eslint-disable-line react-hooks/exhaustive-deps
  const dup = useMemo(() => duplicateMonths(all, k), [all, k]);
  const idOf = (r: BillRecord) => String(r[k.idKey]);
  const personOf = (r: BillRecord) => String(r[k.personKey]);

  const run = async (r: BillRecord, body: Record<string, unknown>, done?: string) => {
    setBusyId(idOf(r));
    try {
      await patch.mutateAsync({ id: idOf(r), patch: body });
      if (done) toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusyId(null);
    }
  };

  const nameOfService = (sid: string, batchId?: string) => {
    const s = services.find((x) => x.ServiceID === sid);
    return s ? (lineItemName(s, batchId) as string) : sid;
  };

  const actions = (r: BillRecord) => {
    const person = userById.get(personOf(r));
    const busy = busyId === idOf(r);
    if (needsApproval(r, k)) return <ApprovePayment onApprove={async (v) => { await patch.mutateAsync({ id: idOf(r), patch: { inrDue: v } }); toast.success("Payment recorded."); }} />;
    const items: RowMenuItem[] = [{ label: "Details, due and subjects…", onSelect: () => setOpenId(idOf(r)) }];
    if (kind === "invoice") items.push({ label: "Discount…", onSelect: () => setOpenId(idOf(r)) });
    items.push({ label: "Download PDF", href: k.pdf(idOf(r)), download: "" });
    if (kind === "invoice") items.push(...copyItems(r, person, services, options.data, isSettled(r, k)));
    items.push({ label: "Delete", danger: true, onSelect: () => setDeleteTarget(r) });
    return (
      <span className="u2-rowactions">
        {r.Status === "Draft" ? (
          <Button size="sm" variant="primary" loading={busy} onClick={() => void run(r, { status: "Sent" }, "Sent.")}>
            Send
          </Button>
        ) : (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => void run(r, { status: "Draft" }, "Moved back to draft.")}>
            Unsend
          </Button>
        )}
        <button type="button" className="u2-iconbtn" aria-label={`Open ${personOf(r)} ${r.Month}/${r.Year}`} title="Open details" onClick={() => setOpenId(idOf(r))}>
          ↗
        </button>
        <RowMenu label={`More actions for ${nameOf(personOf(r))} ${r.Month}/${r.Year}`} items={items} />
      </span>
    );
  };

  const columns: Column<BillRecord>[] = [
    {
      id: "person", header: k.personHeader, sortValue: (r) => nameOf(personOf(r)), tip: (r) => nameOf(personOf(r)),
      cell: (r) => (
        <>
          <strong className="u2-strong">{nameOf(personOf(r))}</strong>{" "}
          {dup.counts.get(dup.keyOf(r))! > 1 && (
            <span title={k.duplicateHint}>
              <Badge kind="warning">⚠ dup?</Badge>
            </span>
          )}
        </>
      ),
    },
    {
      id: "subjects", header: "Subjects", width: 150,
      sortValue: (r) => (Array.isArray(r.LineItems) ? r.LineItems.length : 0),
      tip: (r) => (Array.isArray(r.LineItems) ? r.LineItems.map((li) => nameOfService(li.ServiceID, li.BatchID)).join(", ") : nameOfService(String(r.ServiceID), r.BatchID)),
      cell: (r) => (Array.isArray(r.LineItems) ? (
        <Button size="sm" variant="ghost" onClick={() => setOpenId(idOf(r))}>
          {r.LineItems.length} subject{r.LineItems.length === 1 ? "" : "s"}
        </Button>
      ) : nameOfService(String(r.ServiceID), r.BatchID)),
    },
    { id: "period", header: "Period", width: 76, sortValue: (r) => periodKey(r), cell: (r) => `${r.Month}/${r.Year}` },
    {
      id: "amount", header: "Amount", width: 110, numeric: true, sortValue: (r) => Number(r.Amount),
      cell: (r) => {
        const d = (discountBreakdown(r) as { total: number }).total;
        return (
          <>
            {r.Currency || "INR"} {Number(r.Amount).toFixed(2)}
            {kind === "invoice" && d > 0 && <span className="u2-sub u2-sub--good">{`-${d.toFixed(2)} discount${r.CouponCode ? ` (${r.CouponCode})` : ""}`}</span>}
          </>
        );
      },
    },
    { id: "due", header: "Amount due", width: 110, numeric: true, sortValue: (r) => amountDueInOwnCurrency(r) as number, cell: (r) => `${r.Currency || "INR"} ${(amountDueInOwnCurrency(r) as number).toFixed(2)}` },
    { id: "inramt", header: "INR amt", title: "INR Amount", width: 84, numeric: true, sortValue: (r) => Number(r.INRAmount), cell: (r) => <span title={fxRateTitle(r) ?? undefined}>{Number(r.INRAmount).toFixed(2)}</span> },
    { id: "inrdue", header: "INR due", title: "INR Due", width: 84, numeric: true, sortValue: (r) => Number(r.INRDue), cell: (r) => Number(r.INRDue).toFixed(2) },
    {
      id: "status", header: "Status", width: 84, sortValue: (r) => r.Status,
      cell: (r) => (
        <>
          <Badge kind={r.Status === "Sent" ? "success" : "neutral"}>{r.Status}</Badge>
          {r.SentAt && <span className="u2-sub">{formatDate(r.SentAt) as string}</span>}
        </>
      ),
    },
    {
      id: "paid", header: kind === "invoice" ? "Paid" : "Received", width: 150, sortValue: (r) => Number(!!(r as Record<string, unknown>)[k.paidKey]),
      cell: (r) => {
        const flag = !!(r as Record<string, unknown>)[k.paidKey];
        const at = r[k.paidAtKey] as string | undefined;
        return (
          <>
            <Badge kind={flag ? "success" : "neutral"}>{flag ? k.paidLabel : k.unpaidLabel}</Badge>
            {kind === "invoice" && r.PaymentProofPath && (
              <LinkButton href={`/api/invoices/proof?invoiceId=${idOf(r)}`} target="_blank" title="View payment proof">
                Proof
              </LinkButton>
            )}
            {at && <span className="u2-sub">{formatDate(at) as string}</span>}
            {needsApproval(r, k) && <span className="u2-sub u2-sub--warn">Needs approval</span>}
          </>
        );
      },
    },
    { id: "actions", header: "", title: "Actions", width: 168, cell: actions },
  ];

  const groups = useMemo(() => groupBills(rows, mode === "lanes" ? "table" : mode, k, nameOf), [rows, mode, k, users]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = (r: BillRecord) => (
    <div className="u2-card">
      <div className="u2-card__top">
        <strong className="u2-strong">{nameOf(personOf(r))}</strong>
        <span className="u2-muted">{r.Month}/{r.Year}</span>
      </div>
      <span>{Array.isArray(r.LineItems) ? `${r.LineItems.length} subject${r.LineItems.length === 1 ? "" : "s"}` : nameOfService(String(r.ServiceID), r.BatchID)}</span>
      <span>INR due {Number(r.INRDue).toFixed(2)}</span>
      <div className="u2-card__actions">{actions(r)}</div>
    </div>
  );

  const setF = (patchF: Partial<BillFilters>) => setFilters((p) => ({ ...p, ...patchF }));
  const nActive = activeFilterCount(f);
  const currencies = useMemo(() => [...new Set(all.map((r) => r.Currency || "INR"))].sort(), [all]);

  return (
    <div className="u2-accounts">
      {dup.groups > 0 && (
        <p className="u2-warnbox">
          ⚠ {dup.groups} {kind === "invoice" ? "student" : "staff"}/month{dup.groups === 1 ? "" : "s"} with more than one {k.noun}. Check the rows flagged below; if it&apos;s genuinely a duplicate, delete the extra one.
        </p>
      )}
      <div className="u2-toolbar">
        <input type="search" className="u2-search" placeholder={`Search ${k.personHeader.toLowerCase()}…`} aria-label={`Search ${k.personHeader}`} value={q} onChange={(e) => void setQ(e.target.value || null)} />
        <div className="u2-minw">
          <Combobox aria-label="Status" value={f.status} onChange={(v) => void setStatus(v === "all" ? null : v)} options={(Object.entries(STATUS_FILTER_LABEL) as [string, string][]).map(([value, label]) => ({ value, label }))} />
        </div>
        <Button variant="ghost" aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
          Filters{nActive > 0 ? ` (${nActive})` : ""}
        </Button>
        {nActive > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { setFilters(emptyFilters()); void setQ(null); void setStatus(null); }}>
            Clear
          </Button>
        )}
        <span className="u2-muted" aria-live="polite">{rows.length === all.length ? `${all.length}` : `${rows.length} of ${all.length}`} {k.noun}s</span>
        <div className="u2-seg u2-push" role="group" aria-label="View">
          {MODES.map((m) => (
            <button key={m} type="button" className="u2-seg__btn" aria-pressed={mode === m} data-on={mode === m} onClick={() => void setMode(m === "table" ? null : m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="u2-filters" role="group" aria-label="Value and range filters">
          <Field label="Period from"><TextInput type="month" value={filters.from} onChange={(e) => setF({ from: e.target.value })} /></Field>
          <Field label="Period to"><TextInput type="month" value={filters.to} onChange={(e) => setF({ to: e.target.value })} /></Field>
          <Field label="INR due at least"><TextInput type="number" value={filters.dueMin} onChange={(e) => setF({ dueMin: e.target.value })} /></Field>
          <Field label="INR due at most"><TextInput type="number" value={filters.dueMax} onChange={(e) => setF({ dueMax: e.target.value })} /></Field>
          <Field label="Currency"><Combobox value={filters.currency} onChange={(v) => setF({ currency: v })} placeholder="Any" options={currencies.map((c) => ({ value: c, label: c }))} /></Field>
        </div>
      )}

      {error ? (
        <div role="alert" className="u2-errorbox">
          Could not load {k.noun}s: {error.message}{" "}
          <Button size="sm" variant="ghost" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : mode === "lanes" ? (
        <div className="u2-lanes">
          {LANES.map((lane) => {
            const laneRows = rows.filter((r) => laneOf(r, k) === lane.id);
            return (
              <section key={lane.id} className="u2-lane" aria-label={lane.label}>
                <div className="u2-lane__title">
                  <span>{lane.label}</span>
                  <span className="u2-seg__count">{laneRows.length}</span>
                </div>
                {laneRows.length === 0 && <span className="u2-muted">None</span>}
                {laneRows.map((r) => (
                  <div key={idOf(r)}>{card(r)}</div>
                ))}
              </section>
            );
          })}
        </div>
      ) : mode === "table" ? (
        <DataTable caption={`${k.noun}s`} rows={rows} columns={columns} rowKey={idOf} loading={isPending} initialSort={{ id: "period", dir: "desc" }} emptyText={all.length === 0 ? "None generated yet." : `No ${k.noun}s match this filter.`} card={card} />
      ) : (
        groups.map((g) => {
          const isClosed = mode === "person" ? !closed.has(g.key) : closed.has(g.key);
          const sum = mode === "person" ? personSummary(g.rows, k) : null;
          return (
            <section key={g.key} className="u2-group">
              <div className="u2-group__head">
                <button type="button" className="u2-tree__toggle" aria-expanded={!isClosed} onClick={() => setClosed((p) => { const n = new Set(p); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
                  <span aria-hidden="true">{isClosed ? "▸" : "▾"}</span> {g.label} — {g.rows.length} {k.noun}{g.rows.length === 1 ? "" : "s"}
                </button>
                {g.overdue && <Badge kind="error">Overdue</Badge>}
                {sum && sum.draft > 0 && <Badge kind="neutral">{sum.draft} draft</Badge>}
                {sum && sum.unpaid > 0 && <Badge kind="info">{sum.unpaid} unpaid</Badge>}
                {sum && sum.needsApproval > 0 && <Badge kind="error">{sum.needsApproval} needs approval</Badge>}
              </div>
              {!isClosed && <DataTable caption={g.label} rows={g.rows} columns={columns} rowKey={idOf} card={card} />}
            </section>
          );
        })
      )}

      <BillSheet kind={kind} billId={openId} users={users} services={services} onClose={() => setOpenId(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete this ${k.noun}?`}
        description={deleteTarget ? `${nameOf(personOf(deleteTarget))}, ${deleteTarget.Month}/${deleteTarget.Year}. This cannot be undone.` : ""}
        confirmLabel="Yes, delete"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          await del.mutateAsync(idOf(deleteTarget));
          toast.success(`${k.noun[0]?.toUpperCase()}${k.noun.slice(1)} deleted.`);
        }}
      />
    </div>
  );
}

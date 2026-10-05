"use client";

import { useState } from "react";
import { toast } from "sonner";
import { amountDueInOwnCurrency, lineItemName } from "@/lib/billing";
import { formatDate } from "@/lib/formatDate";
import { discountBreakdown } from "@/lib/invoiceDiscount";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { Field, TextInput } from "@/ui2/components/Field";
import { RowMenu } from "@/ui2/components/RowMenu";
import { Sheet } from "@/ui2/components/Sheet";
import { useBills, useDeleteBill, usePatchBill, usePaymentOptions } from "@/ui2/queries/billing";
import type { BillLineItem, BillRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { ApprovePayment } from "./ApprovePayment";
import { copyItems } from "./billActions";
import { KINDS, fxRateTitle, isSettled, needsApproval, periodLabel, type BillKind } from "./billingLogic";
import "./billing.css";
import "@/ui2/features/accounts/accounts.css";

const money = (r: BillRecord, n: number) => `${r.Currency || "INR"} ${n.toFixed(2)}`;

/** Everything about one invoice or paycheck: figures, due, discount, line items, send, PDF, reminder, delete. */
export function BillSheet({ kind, billId, users, services, onClose }: { kind: BillKind; billId: string | null; users: readonly UserRecord[]; services: readonly ServiceRecord[]; onClose: () => void }) {
  const k = KINDS[kind];
  const { data } = useBills(kind);
  const bill = billId ? data?.find((r) => r[k.idKey] === billId) ?? null : null;
  const person = bill ? users.find((u) => u.UserID === bill[k.personKey]) : undefined;
  return (
    <Sheet open={!!billId} onOpenChange={(o) => !o && onClose()} title={bill ? `${person?.Name ?? String(bill[k.personKey])} · ${periodLabel(bill)}` : "Details"} subtitle={billId ?? undefined} wide>
      {bill && <Body key={billId} kind={kind} bill={bill} person={person} services={services} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ kind, bill, person, services, onClose }: { kind: BillKind; bill: BillRecord; person: UserRecord | undefined; services: readonly ServiceRecord[]; onClose: () => void }) {
  const k = KINDS[kind];
  const id = String(bill[k.idKey]);
  const patch = usePatchBill(kind);
  const del = useDeleteBill(kind);
  const options = usePaymentOptions();
  const [due, setDue] = useState(String(bill.INRDue));
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const approval = needsApproval(bill, k);
  const settled = isSettled(bill, k);
  const isDraft = bill.Status === "Draft";
  const fx = fxRateTitle(bill);
  const nameOfService = (sid: string, batchId?: string) => {
    const s = services.find((x) => x.ServiceID === sid);
    return s ? (lineItemName(s, batchId) as string) : sid;
  };

  async function run(patchBody: Record<string, unknown>, done?: string, lineItemIndex?: number) {
    setError("");
    try {
      await patch.mutateAsync({ id, patch: patchBody, lineItemIndex });
      if (done) toast.success(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    }
  }

  return (
    <div className="u2-form">
      <div className="u2-rowactions">
        <Badge kind={bill.Status === "Sent" ? "success" : "neutral"}>{bill.Status}</Badge>
        <Badge kind={(bill as Record<string, unknown>)[k.paidKey] ? "success" : "neutral"}>{(bill as Record<string, unknown>)[k.paidKey] ? k.paidLabel : k.unpaidLabel}</Badge>
        {approval && <Badge kind="warning">Needs approval</Badge>}
        {bill.SentAt && <span className="u2-muted">Sent {formatDate(bill.SentAt) as string}</span>}
        {(bill[k.paidAtKey] as string | undefined) && <span className="u2-muted">{k.paidLabel} {formatDate(bill[k.paidAtKey] as string) as string}</span>}
        {kind === "invoice" && bill.PaymentProofPath && (
          <LinkButton href={`/api/invoices/proof?invoiceId=${id}`} target="_blank">
            Payment proof
          </LinkButton>
        )}
      </div>

      <dl className="u2-import__facts">
        <div><dt>Amount</dt><dd>{money(bill, Number(bill.Amount))}</dd></div>
        <div><dt>Amount due</dt><dd>{money(bill, amountDueInOwnCurrency(bill) as number)}</dd></div>
        <div><dt>INR amount</dt><dd title={fx ?? undefined}>{Number(bill.INRAmount).toFixed(2)}</dd></div>
        <div><dt>INR due</dt><dd>{Number(bill.INRDue).toFixed(2)}</dd></div>
      </dl>

      <div className="u2-rowactions">
        {approval && <ApprovePayment onApprove={(v) => run({ inrDue: v }, "Payment recorded.")} />}
        {isDraft ? (
          <Button variant="primary" loading={patch.isPending} onClick={() => void run({ status: "Sent" }, "Sent.")}>
            Send
          </Button>
        ) : (
          <Button variant="ghost" loading={patch.isPending} onClick={() => void run({ status: "Draft" }, "Moved back to draft.")}>
            Unsend
          </Button>
        )}
        <LinkButton href={k.pdf(id)} download>
          PDF
        </LinkButton>
        {kind === "invoice" && <RowMenu label="Copy message" trigger="Copy ▾" items={copyItems(bill, person, services, options.data, settled)} />}
        <Button variant="ghost" className="u2-danger-text" onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      <Field label="INR due" hint="Adjust to track a partial payment. Only this figure is editable by hand.">
        <div className="u2-inline">
          <TextInput type="number" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button variant="primary" loading={patch.isPending} disabled={due === String(bill.INRDue)} disabledReason="Change the figure first." onClick={() => void run({ inrDue: due }, "Due saved.")}>
            Save due
          </Button>
        </div>
      </Field>

      {kind === "invoice" && <DiscountEditor bill={bill} busy={patch.isPending} onSave={(v) => run(v, "Discount saved.")} />}

      {Array.isArray(bill.LineItems) && (
        <section>
          <h3 className="u2-sheet__title" style={{ fontSize: "var(--u2-text-lg)", marginBottom: "var(--u2-space-2)" }}>
            Subjects
          </h3>
          <table className="u2-lineitems">
            <thead>
              <tr>
                <th>Subject</th>
                <th className="u2-money">Scheduled hrs</th>
                <th className="u2-money">Attended hrs</th>
                <th className="u2-money">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bill.LineItems.map((li, idx) => (
                <LineItemRow key={idx} li={li} name={nameOfService(li.ServiceID, li.BatchID)} onSave={(v) => run(v, "Subject saved.", idx)} />
              ))}
            </tbody>
          </table>
        </section>
      )}
      {error && (
        <p role="alert" className="u2-form__error">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete this ${k.noun}?`}
        description="This cannot be undone."
        confirmLabel="Yes, delete"
        danger
        onConfirm={async () => {
          await del.mutateAsync(id);
          toast.success(`${k.noun[0]?.toUpperCase()}${k.noun.slice(1)} deleted.`);
          onClose();
        }}
      />
    </div>
  );
}

function DiscountEditor({ bill, busy, onSave }: { bill: BillRecord; busy: boolean; onSave: (v: Record<string, unknown>) => Promise<void> }) {
  const [p, setP] = useState(String(bill.DiscountPercent ?? 0));
  const [c, setC] = useState(String(bill.CustomDiscount ?? 0));
  const [code, setCode] = useState(bill.CouponCode || "");
  const [cp, setCp] = useState(String(bill.CouponPercent ?? 0));
  const [error, setError] = useState("");
  const d = discountBreakdown(bill) as { total: number; net: number };
  const cur = bill.Currency || "INR";
  return (
    <section className="u2-box">
      <strong>Discount</strong>
      <div className="u2-grid2">
        <Field label="Discount %"><TextInput type="number" min="0" max="100" step="any" value={p} onChange={(e) => setP(e.target.value)} /></Field>
        <Field label={`Custom discount (${cur})`}><TextInput type="number" min="0" step="any" value={c} onChange={(e) => setC(e.target.value)} /></Field>
        <Field label="Coupon code"><TextInput maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="Coupon discount %"><TextInput type="number" min="0" max="100" step="any" value={cp} onChange={(e) => setCp(e.target.value)} /></Field>
      </div>
      <p className="u2-muted">{`Subtotal ${cur} ${Number(bill.Amount).toFixed(2)}, discount -${d.total.toFixed(2)}, bill ${d.net.toFixed(2)} (saved discounts reduce Due).`}</p>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
      <div className="u2-form__actions">
        <Button variant="primary" loading={busy} onClick={() => void onSave({ discountPercent: p, customDiscount: c, couponCode: code, couponPercent: cp }).then(() => setError("")).catch((e: Error) => setError(e.message))}>
          Save discount
        </Button>
      </div>
    </section>
  );
}

function LineItemRow({ li, name, onSave }: { li: BillLineItem; name: string; onSave: (v: Record<string, unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [sched, setSched] = useState(li.ScheduledHours);
  const [att, setAtt] = useState(li.AttendedHours);
  const [amount, setAmount] = useState(li.Amount);
  const [saving, setSaving] = useState(false);
  const cancel = () => { setSched(li.ScheduledHours); setAtt(li.AttendedHours); setAmount(li.Amount); setEditing(false); };
  async function save() {
    setSaving(true);
    try {
      await onSave({ scheduledHours: sched, attendedHours: att, amount });
      setEditing(false);
    } catch {
      /* the sheet shows the server's message */
    } finally {
      setSaving(false);
    }
  }
  return (
    <tr>
      <td>
        {name} {li.Note && <span title={li.Note} aria-label={`Note: ${li.Note}`}>⚠</span>}
      </td>
      <td className="u2-money">{editing ? <TextInput type="number" step="0.5" aria-label="Scheduled hours" value={sched ?? ""} onChange={(e) => setSched(e.target.value)} /> : (li.ScheduledHours ?? "—")}</td>
      <td className="u2-money">{editing ? <TextInput type="number" step="0.5" aria-label="Attended hours" value={att ?? ""} onChange={(e) => setAtt(e.target.value)} /> : (li.AttendedHours ?? "—")}</td>
      <td className="u2-money">{editing ? <TextInput type="number" aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} /> : `${li.Currency || "INR"} ${li.Amount}`}</td>
      <td>
        {editing ? (
          <span className="u2-rowactions">
            <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>Save</Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={cancel}>Cancel</Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </td>
    </tr>
  );
}

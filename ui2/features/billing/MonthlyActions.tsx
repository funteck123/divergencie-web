"use client";

import { useMemo, useState } from "react";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { CheckField, Field, TextInput } from "@/ui2/components/Field";
import { useGenerate, useManualInvoice, useManualPaycheck, useRebuild } from "@/ui2/queries/billing";
import type { EnrollmentRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { generateSummary, rebuildSummary } from "./billingLogic";
import "./billing.css";
import "@/ui2/features/accounts/accounts.css";

const now = new Date();

function YearMonth({ year, month, setYear, setMonth }: { year: string; month: string; setYear: (v: string) => void; setMonth: (v: string) => void }) {
  return (
    <div className="u2-grid2">
      <Field label="Year"><TextInput type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
      <Field label="Month"><TextInput type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
    </div>
  );
}

/** The four monthly actions of the classic Billing tab, each with its own "use for" line: Generate, Rebuild, Create Invoice, Create Paycheck. */
export function MonthlyActions({ users, services, enrollments }: { users: readonly UserRecord[]; services: readonly ServiceRecord[]; enrollments: readonly EnrollmentRecord[] }) {
  const [summary, setSummary] = useState<{ text: string; skippedItems: string[] } | null>(null);
  return (
    <div className="u2-accounts">
      <div className="u2-split">
        <GeneratePanel onDone={setSummary} />
        <RebuildPanel users={users} onDone={(text) => setSummary({ text, skippedItems: [] })} />
      </div>
      {summary && <Summary summary={summary} />}
      <div className="u2-split">
        <ManualInvoicePanel people={users.filter((u) => u.UserType === "Student")} services={services} enrollments={enrollments} />
        <ManualPaycheckPanel people={users.filter((u) => ["Teacher", "Staff", "Ambassador"].includes(u.UserType))} services={services} />
      </div>
    </div>
  );
}

function Summary({ summary }: { summary: { text: string; skippedItems: string[] } }) {
  const [show, setShow] = useState(false);
  return (
    <div role="status" className="u2-bill-hint">
      <p>{summary.text}</p>
      {summary.skippedItems.length > 0 && (
        <>
          <Button size="sm" variant="ghost" aria-expanded={show} onClick={() => setShow((v) => !v)}>
            {show ? "▾ Hide" : "▸ Show"} skipped items ({summary.skippedItems.length})
          </Button>
          {show && (
            <ul>
              {summary.skippedItems.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function GeneratePanel({ onDone }: { onDone: (s: { text: string; skippedItems: string[] }) => void }) {
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const gen = useGenerate();
  async function run() {
    setError("");
    try {
      onDone(generateSummary(await gen.mutateAsync({ year: Number(year), month: Number(month) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate.");
    }
  }
  return (
    <section className="u2-box">
      <h2>Generate Drafts</h2>
      <p className="u2-muted">
        Use for: the normal monthly run.{" "}
        <span title="Amount is auto-calculated: (Service monthly cost ÷ scheduled hours) × attended hours. INR Amount is auto-converted using the exchange rate as of the 1st of the invoice/paycheck's own month, only INR Due is manually adjustable, for tracking partial payments." style={{ textDecoration: "underline dotted", cursor: "help" }}>
          How amounts are calculated
        </span>
      </p>
      <YearMonth year={year} month={month} setYear={setYear} setMonth={setMonth} />
      <div className="u2-form__actions">
        <Button variant="primary" loading={gen.isPending} onClick={() => void run()}>
          Generate drafts for this month
        </Button>
      </div>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
    </section>
  );
}

function RebuildPanel({ users, onDone }: { users: readonly UserRecord[]; onDone: (text: string) => void }) {
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const rebuild = useRebuild();
  const people = useMemo(() => users.filter((u) => ["Student", "Teacher", "Staff", "Ambassador"].includes(u.UserType)).sort((a, b) => a.Name.localeCompare(b.Name)), [users]);
  const toggle = (id: string, on: boolean) => setSelected((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n; });
  return (
    <section className="u2-box">
      <h2>Rebuild Drafts</h2>
      <p className="u2-muted">
        Use for: fixing stale drafts after a correction, never touches a Sent record.{" "}
        <span title="Deletes the selected people's existing DRAFT invoices/paychecks for this month and regenerates them fresh with current attendance/rate data. Won't catch anyone new, Generate Drafts already covers them." style={{ textDecoration: "underline dotted", cursor: "help" }}>
          Details
        </span>
      </p>
      <YearMonth year={year} month={month} setYear={setYear} setMonth={setMonth} />
      <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 2 }}>
        {people.map((p) => (
          <CheckField key={p.UserID} label={`${p.Name} (${p.UserType})`} checked={selected.has(p.UserID)} onChange={(on) => toggle(p.UserID, on)} />
        ))}
        {people.length === 0 && <p className="u2-muted">No people found.</p>}
      </div>
      <div className="u2-form__actions">
        <Button variant="primary" disabled={selected.size === 0} disabledReason="Tick at least one person." onClick={() => setConfirming(true)}>
          Rebuild {selected.size > 0 ? `${selected.size} selected` : ""}
        </Button>
      </div>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Rebuild drafts?"
        description={`This deletes ${selected.size} person's existing draft(s) for ${month}/${year} and regenerates them. Confirm?`}
        confirmLabel="Yes, rebuild"
        danger
        onConfirm={async () => {
          setError("");
          const studentIds = people.filter((p) => p.UserType === "Student" && selected.has(p.UserID)).map((p) => p.UserID);
          const staffIds = people.filter((p) => p.UserType !== "Student" && selected.has(p.UserID)).map((p) => p.UserID);
          const res = await rebuild.mutateAsync({ year: Number(year), month: Number(month), studentIds, staffIds });
          onDone(rebuildSummary(res.invoiceRes ? res.invoiceRes.created?.length || 0 : null, studentIds.length, res.paycheckRes ? res.paycheckRes.created?.length || 0 : null, staffIds.length));
          setSelected(new Set());
        }}
      />
    </section>
  );
}

function ManualInvoicePanel({ people, services, enrollments }: { people: readonly UserRecord[]; services: readonly ServiceRecord[]; enrollments: readonly EnrollmentRecord[] }) {
  const [personId, setPersonId] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const create = useManualInvoice();
  const enrolled = useMemo(() => enrollments.filter((e) => e.UserID === personId).map((e) => services.find((s) => s.ServiceID === e.ServiceID)).filter((s): s is ServiceRecord => !!s), [enrollments, services, personId]);

  function selectPerson(id: string) {
    setPersonId(id);
    setSuccess("");
    setChecked(Object.fromEntries(enrollments.filter((e) => e.UserID === id).map((e) => [e.ServiceID, true])));
    setAmounts({});
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const rows = enrolled.filter((s) => checked[s.ServiceID] && amounts[s.ServiceID]);
    if (rows.length === 0) return setError("Check at least one subject and enter an amount for it.");
    const name = people.find((p) => p.UserID === personId)?.Name || personId;
    try {
      await create.mutateAsync({ personId, year: Number(year), month: Number(month), rows: rows.map((s) => ({ serviceId: s.ServiceID, amount: Number(amounts[s.ServiceID]) })) });
      setPersonId("");
      setChecked({});
      setAmounts({});
      setSuccess(`Created ${rows.length} draft invoice line item${rows.length === 1 ? "" : "s"} for ${name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create.");
    }
  }
  return (
    <section className="u2-box">
      <h2>Create Invoice</h2>
      <p className="u2-muted">Use for: one-off exceptions Generate Drafts won&apos;t create.</p>
      <form onSubmit={submit} className="u2-form">
        <Field label="Student">
          <Combobox value={personId} onChange={selectPerson} placeholder="Select Student…" options={people.map((p) => ({ value: p.UserID, label: p.Name }))} />
        </Field>
        <YearMonth year={year} month={month} setYear={setYear} setMonth={setMonth} />
        {personId && (
          <div className="u2-rows">
            {enrolled.length === 0 && <p className="u2-muted">No enrollments for this student.</p>}
            {enrolled.map((s) => (
              <div key={s.ServiceID} className="u2-inline u2-inline--center">
                <CheckField label={s.Name} checked={!!checked[s.ServiceID]} onChange={(on) => setChecked((p) => ({ ...p, [s.ServiceID]: on }))} />
                <TextInput type="number" aria-label={`Amount for ${s.Name}`} placeholder="Amount" style={{ maxWidth: 110 }} disabled={!checked[s.ServiceID]} value={amounts[s.ServiceID] || ""} onChange={(e) => setAmounts((p) => ({ ...p, [s.ServiceID]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <div className="u2-form__actions">
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!personId} disabledReason="Select a student first.">Create draft(s)</Button>
        </div>
        {success && <p role="status" className="u2-sub--good">✓ {success}</p>}
      </form>
    </section>
  );
}

function ManualPaycheckPanel({ people, services }: { people: readonly UserRecord[]; services: readonly ServiceRecord[] }) {
  const [personId, setPersonId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const create = useManualPaycheck();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const name = people.find((p) => p.UserID === personId)?.Name || personId;
    try {
      await create.mutateAsync({ personId, serviceId, year: Number(year), month: Number(month), amount: Number(amount) });
      setPersonId("");
      setServiceId("");
      setAmount("");
      setSuccess(`Created draft for ${name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create.");
    }
  }
  return (
    <section className="u2-box">
      <h2>Create Paycheck</h2>
      <p className="u2-muted">Use for: one-off exceptions Generate Drafts won&apos;t create.</p>
      <form onSubmit={submit} className="u2-form">
        <Field label="Staff">
          <Combobox value={personId} onChange={setPersonId} placeholder="Select Staff…" options={people.map((p) => ({ value: p.UserID, label: p.Name }))} />
        </Field>
        <Field label="Service">
          <Combobox value={serviceId} onChange={setServiceId} placeholder="Select service…" options={services.map((s) => ({ value: s.ServiceID, label: s.Name }))} />
        </Field>
        <YearMonth year={year} month={month} setYear={setYear} setMonth={setMonth} />
        <Field label="Amount">
          <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <div className="u2-form__actions">
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!personId || !serviceId} disabledReason="Select a person and a service first.">Create draft</Button>
        </div>
        {success && <p role="status" className="u2-sub--good">✓ {success}</p>}
      </form>
    </section>
  );
}

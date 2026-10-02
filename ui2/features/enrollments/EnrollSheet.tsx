"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BILLING_TYPES, batchScheduleLabel } from "@/lib/billing";
import { CURRENCIES_FULL } from "@/lib/accountTypes";
import { groupMatches } from "@/lib/client";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { Field, TextInput } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { useAddRate, useEnroll, type EnrollRow, type NewRate } from "@/ui2/queries/enrollments";
import type { ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { batchesFor, failureMessage, pickService, rateLabel, ratesFor } from "./enrollLogic";
import "@/ui2/features/services/services.css";

const currencyOptions: ComboOption[] = CURRENCIES_FULL.map((c: { code: string }) => ({ value: c.code, label: c.code }));
const billingOptions: ComboOption[] = (BILLING_TYPES as string[]).map((t) => ({ value: t, label: t }));
const emptyRow = (): EnrollRow => ({ serviceId: "", batchId: "", rateId: "" });
const emptyRate = (): NewRate => ({ currency: "INR", rate: "", description: "", billingType: "Monthly" });

/** Enroll one person of a group into one or more services (the classic "Enroll a ... into Service(s)" card, in a side panel). */
export function EnrollSheet({ open, group, people, services, onClose }: { open: boolean; group: string; people: readonly UserRecord[]; services: readonly ServiceRecord[]; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={`Enroll a ${group} into service(s)`}>
      {open && <EnrollForm key={group} group={group} people={people} services={services} onClose={onClose} />}
    </Sheet>
  );
}

function EnrollForm({ group, people, services, onClose }: { group: string; people: readonly UserRecord[]; services: readonly ServiceRecord[]; onClose: () => void }) {
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<EnrollRow[]>([emptyRow()]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rateRow, setRateRow] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState<NewRate>(emptyRate);
  const [rateError, setRateError] = useState("");
  const [error, setError] = useState("");
  const enroll = useEnroll();
  const addRate = useAddRate();

  const eligible = useMemo(() => services.filter((s) => groupMatches(s.Group, group) as boolean), [services, group]);
  const selected = people.find((u) => u.UserID === userId);
  const nameOfService = (id: string) => services.find((s) => s.ServiceID === id)?.Name ?? id;
  const update = (i: number, patch: Partial<EnrollRow>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.serviceId).length;
  const count = chosen || rows.length;

  async function submitRate(i: number) {
    setRateError("");
    if (!rateDraft.rate) return setRateError("Enter an amount.");
    const row = rows[i];
    if (!row) return;
    try {
      const res = await addRate.mutateAsync({ serviceId: row.serviceId, batchId: row.batchId, rate: rateDraft });
      update(i, { rateId: res.rate.RateID });
      setRateRow(null);
    } catch (e) {
      setRateError(e instanceof Error ? e.message : "Could not add the rate.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valid = rows.filter((r) => r.serviceId);
    const { created, failures } = await enroll.mutateAsync({ userId, rows: valid, startDate, endDate });
    if (failures.length) setError(failureMessage(failures, valid.length, nameOfService));
    if (created.length) toast.success(`Enrolled ${selected?.Name ?? "person"} into ${created.length} service${created.length === 1 ? "" : "s"}.`);
    if (!failures.length) onClose();
    else setRows(valid.filter((r) => failures.some((f) => f.serviceId === r.serviceId)));
  }

  return (
    <form onSubmit={submit} className="u2-form">
      <Field label={group}>
        <Combobox value={userId} onChange={setUserId} placeholder={`Select ${group.toLowerCase()}…`} options={people.map((u) => ({ value: u.UserID, label: u.Name }))} />
      </Field>

      {rows.map((row, i) => {
        const svc = eligible.find((s) => s.ServiceID === row.serviceId);
        const batches = batchesFor(svc);
        const rates = ratesFor(svc, row.batchId, selected?.UserType);
        return (
          <div key={i} className="u2-box">
            <div className="u2-inline">
              <strong>Service {i + 1}</strong>
              {rows.length > 1 && (
                <Button size="sm" variant="ghost" className="u2-danger-text" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              )}
            </div>
            <Field label="Service">
              <Combobox value={row.serviceId} onChange={(id) => update(i, pickService(eligible, id))} placeholder="Select service…" options={eligible.map((s) => ({ value: s.ServiceID, label: s.Name }))} />
            </Field>
            {batches.length > 1 && (
              <Field label="Batch">
                <Combobox value={row.batchId} onChange={(id) => update(i, { batchId: id, rateId: "" })} options={batches.map((b) => ({ value: b.BatchID, label: `${b.BatchName ?? ""}${batchScheduleLabel(b) ? ` — ${batchScheduleLabel(b)}` : ""}` }))} />
              </Field>
            )}
            {rates.length > 0 && (
              <Field label="Rate">
                <Combobox value={row.rateId} onChange={(id) => update(i, { rateId: id })} placeholder="Select a rate…" options={rates.map((r) => ({ value: r.RateID, label: rateLabel(r) }))} />
              </Field>
            )}
            {row.serviceId &&
              (rateRow === i ? (
                <div className="u2-box u2-box--inner">
                  <div className="u2-grid3">
                    <Field label="Currency">
                      <Combobox value={rateDraft.currency} onChange={(v) => setRateDraft({ ...rateDraft, currency: v })} options={currencyOptions} />
                    </Field>
                    <Field label="Amount">
                      <TextInput type="number" value={rateDraft.rate} onChange={(e) => setRateDraft({ ...rateDraft, rate: e.target.value })} />
                    </Field>
                    <Field label="Frequency">
                      <Combobox value={rateDraft.billingType} onChange={(v) => setRateDraft({ ...rateDraft, billingType: v })} options={billingOptions} />
                    </Field>
                  </div>
                  <Field label="Description (optional)">
                    <TextInput maxLength={80} value={rateDraft.description} onChange={(e) => setRateDraft({ ...rateDraft, description: e.target.value })} />
                  </Field>
                  {rateError && (
                    <p role="alert" className="u2-form__error">
                      {rateError}
                    </p>
                  )}
                  <div className="u2-form__actions">
                    <Button variant="primary" size="sm" loading={addRate.isPending} onClick={() => void submitRate(i)}>
                      Add rate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRateRow(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setRateRow(i); setRateDraft(emptyRate()); setRateError(""); }}>
                  + New rate for this service
                </Button>
              ))}
          </div>
        );
      })}
      <Button variant="ghost" size="sm" onClick={() => setRows((p) => [...p, emptyRow()])}>
        + Add another service
      </Button>

      <div className="u2-grid2">
        <Field label="Start date" hint="Optional. Applies to all services above.">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date" hint="Optional. Leave blank if ongoing.">
          <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      {error && (
        <p role="alert" className="u2-form__error">
          {error}
        </p>
      )}
      <div className="u2-form__actions">
        <Button type="submit" variant="primary" loading={enroll.isPending} disabled={!userId} disabledReason="Select who to enroll first.">
          Enroll into {count} service{count === 1 ? "" : "s"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

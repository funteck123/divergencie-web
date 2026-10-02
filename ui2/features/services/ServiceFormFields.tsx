"use client";

import { useMemo } from "react";
import { BILLING_TYPES } from "@/lib/billing";
import { CURRENCIES_FULL, DEPARTMENTS } from "@/lib/accountTypes";
import { TIMEZONE_GROUPS } from "@/lib/timezones";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { CheckField, Field, FieldGroup, TextInput } from "@/ui2/components/Field";
import { PersonLink, type PersonOption } from "@/ui2/components/PersonLink";
import type { UserRecord } from "@/ui2/queries/types";
import {
  ALL_GROUPS, DAYS, emptyBatch, emptyComponent, emptyLink, emptyOccurrence, emptyRate, flagsOf, effectiveName, sessionOptions, typeOptionsFor,
  type BatchForm, type LinkForm, type OccurrenceForm, type RateForm, type ServiceForm,
} from "./serviceForm";

const currencyOptions: ComboOption[] = CURRENCIES_FULL.map((c: { code: string }) => ({ value: c.code, label: c.code }));
const billingOptions: ComboOption[] = (BILLING_TYPES as string[]).map((t) => ({ value: t, label: t }));
const dayOptions: ComboOption[] = DAYS.map((d) => ({ value: d, label: d }));
const timezoneOptions: ComboOption[] = TIMEZONE_GROUPS.flatMap((g: { label: string; options: { value: string; label: string }[] }) => g.options.map((o) => ({ value: o.value, label: o.label, group: g.label })));
const departmentOptions: ComboOption[] = (DEPARTMENTS as string[]).map((d) => ({ value: d, label: d }));

/** Replace item `i` of an array. */
const setAt = <T,>(list: readonly T[], i: number, next: T): T[] => list.map((x, j) => (j === i ? next : x));
const removeAt = <T,>(list: readonly T[], i: number): T[] => list.filter((_, j) => j !== i);

export function RateRows({ rates, onChange, groups }: { rates: RateForm[]; onChange: (next: RateForm[]) => void; groups?: readonly string[] }) {
  return (
    <div className="u2-rows">
      {rates.map((r, i) => {
        const set = <K extends keyof RateForm>(k: K, v: RateForm[K]) => onChange(setAt(rates, i, { ...r, [k]: v }));
        return (
          <div key={r.rateId ?? i} className="u2-row u2-row--rate">
            <Field label="Currency">
              <Combobox value={r.currency} onChange={(v) => set("currency", v)} options={currencyOptions} />
            </Field>
            <Field label="Rate">
              <TextInput type="number" value={r.rate} onChange={(e) => set("rate", e.target.value)} />
            </Field>
            <Field label="Description">
              <TextInput maxLength={80} value={r.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Billing type">
              <Combobox value={r.billingType} onChange={(v) => set("billingType", v)} options={billingOptions} />
            </Field>
            {groups && (
              <Field label="Restrict to">
                <Combobox value={r.group} onChange={(v) => set("group", v)} placeholder="Any of the above" options={groups.map((g) => ({ value: g, label: `${g} only` }))} />
              </Field>
            )}
            {rates.length > 1 && (
              <Button variant="ghost" size="sm" aria-label={`Remove rate ${i + 1}`} onClick={() => onChange(removeAt(rates, i))}>
                ✕
              </Button>
            )}
          </div>
        );
      })}
      <Button variant="ghost" size="sm" onClick={() => onChange([...rates, emptyRate()])}>
        + Add rate
      </Button>
    </div>
  );
}

export function OccurrenceRows({ occurrences, onChange, people }: { occurrences: OccurrenceForm[]; onChange: (next: OccurrenceForm[]) => void; people: readonly PersonOption[] }) {
  return (
    <div className="u2-rows">
      {occurrences.map((o, i) => {
        const set = <K extends keyof OccurrenceForm>(k: K, v: OccurrenceForm[K]) => onChange(setAt(occurrences, i, { ...o, [k]: v }));
        return (
          <div key={o.occuranceId ?? i} className="u2-row u2-row--occ">
            <Field label="Day">
              <Combobox value={o.day} onChange={(v) => set("day", v)} options={dayOptions} />
            </Field>
            <Field label="Time">
              <TextInput type="time" value={o.time} onChange={(e) => set("time", e.target.value)} />
            </Field>
            <Field label="Hours">
              <TextInput type="number" step="0.5" value={o.duration} onChange={(e) => set("duration", e.target.value)} />
            </Field>
            <Field label="Timezone">
              <Combobox value={o.timezone} onChange={(v) => set("timezone", v)} options={timezoneOptions} />
            </Field>
            <div className="u2-row__wide">
              <PersonLink nameLabel="Instructor" people={people} name={o.facilitator} userId={o.facilitatorUserId} onChange={(name, id) => onChange(setAt(occurrences, i, { ...o, facilitator: name, facilitatorUserId: id }))} />
            </div>
            {occurrences.length > 1 && (
              <Button variant="ghost" size="sm" aria-label={`Remove occurrence ${i + 1}`} onClick={() => onChange(removeAt(occurrences, i))}>
                ✕
              </Button>
            )}
          </div>
        );
      })}
      <Button variant="ghost" size="sm" onClick={() => onChange([...occurrences, emptyOccurrence()])}>
        + Add occurrence
      </Button>
    </div>
  );
}

function LinkRows({ links, onChange }: { links: LinkForm[]; onChange: (next: LinkForm[]) => void }) {
  return (
    <div className="u2-rows">
      {links.map((l, i) => (
        <div key={l.linkId ?? i} className="u2-row u2-row--link">
          <Field label="Link name">
            <TextInput placeholder="e.g. Answers" value={l.name} onChange={(e) => onChange(setAt(links, i, { ...l, name: e.target.value }))} />
          </Field>
          <Field label="URL">
            <TextInput value={l.url} onChange={(e) => onChange(setAt(links, i, { ...l, url: e.target.value }))} />
          </Field>
          {links.length > 1 && (
            <Button variant="ghost" size="sm" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(removeAt(links, i))}>
              ✕
            </Button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...links, emptyLink()])}>
        + Add link
      </Button>
    </div>
  );
}

/** Everything of the classic Create/Edit Service form, in the same order, driven by the same three flags. */
export function ServiceFormFields({ form, setForm, users }: { form: ServiceForm; setForm: (next: ServiceForm) => void; users: readonly UserRecord[] }) {
  const { cohortEligible, isRoleBasedService, isStaffRole, isAdmissions } = flagsOf(form);
  const set = <K extends keyof ServiceForm>(k: K, v: ServiceForm[K]) => setForm({ ...form, [k]: v });
  const typeOptions = useMemo(() => typeOptionsFor(form.group), [form.group]);
  const teachers = useMemo<PersonOption[]>(() => users.filter((u) => u.UserType === "Teacher").map((u) => ({ id: u.UserID, name: u.Name })), [users]);
  const roleUsers = useMemo<PersonOption[]>(() => users.filter((u) => u.UserType === form.group[0]).map((u) => ({ id: u.UserID, name: u.Name })), [users, form.group]);
  const sessions = useMemo(() => sessionOptions(), []);

  function toggleGroup(g: string) {
    const next = form.group.includes(g) ? form.group.filter((x) => x !== g) : [...form.group, g];
    // TKT-0116: if the current Type is not valid for the new groups, switch to the first valid one.
    const nextTypes = typeOptionsFor(next);
    setForm({ ...form, group: next, type: nextTypes.length > 0 && !nextTypes.includes(form.type) ? (nextTypes[0] as string) : form.type });
  }

  return (
    <>
      <Field label="Service name">
        <div className="u2-inline">
          <TextInput value={effectiveName(form)} required onChange={(e) => setForm({ ...form, name: e.target.value, nameManuallyEdited: true })} />
          <Button variant="ghost" title="Fill from the fields below" onClick={() => set("nameManuallyEdited", false)}>
            ↺ Suggest
          </Button>
        </div>
      </Field>

      <FieldGroup legend="Open to">
        <p className="u2-muted">Trial books Student-open services; each Interview track books its own matching group (Teacher, Staff, Ambassador).</p>
        <div className="u2-checks">
          {ALL_GROUPS.map((g) => (
            <CheckField key={g} label={g} checked={form.group.includes(g)} onChange={() => toggleGroup(g)} />
          ))}
        </div>
      </FieldGroup>

      <Field label="Type">
        <Combobox value={form.type} onChange={(v) => set("type", v)} options={typeOptions.map((t) => ({ value: t, label: t }))} allowCustom />
      </Field>

      {isRoleBasedService && (
        <>
          <Field label="Role (job title)">
            <TextInput value={form.role} onChange={(e) => set("role", e.target.value)} />
          </Field>
          {isStaffRole && (
            <Field label="Department">
              <Combobox value={form.department} onChange={(v) => set("department", v)} options={departmentOptions} />
            </Field>
          )}
        </>
      )}

      {isAdmissions && (
        <>
          <Field label="Country">
            <TextInput placeholder="e.g. UK" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </Field>
          <Field label="University">
            <TextInput value={form.university} onChange={(e) => set("university", e.target.value)} />
          </Field>
        </>
      )}

      {cohortEligible && (
        <>
          <Field label="Curriculum / Board">
            <TextInput placeholder="e.g. Cambridge" value={form.board} onChange={(e) => set("board", e.target.value)} />
          </Field>
          <Field label="Course">
            <TextInput placeholder="e.g. IGCSE, A-Level, SAT" value={form.course} onChange={(e) => set("course", e.target.value)} />
          </Field>
          <Field label="Subject Code">
            <TextInput value={form.subjectCode} onChange={(e) => set("subjectCode", e.target.value)} />
          </Field>
          <Field label="Subject Name">
            <TextInput value={form.subjectName} onChange={(e) => set("subjectName", e.target.value)} />
          </Field>
          <FieldGroup legend="Resource links">
            <p className="u2-muted">Shown on the Student&apos;s and Teacher&apos;s own Resources section for this service.</p>
            <Field label="Recordings link">
              <TextInput value={form.recordingsLink} onChange={(e) => set("recordingsLink", e.target.value)} />
            </Field>
            <Field label="Syllabus link">
              <TextInput value={form.syllabusLink} onChange={(e) => set("syllabusLink", e.target.value)} />
            </Field>
            <Field label="Worksheets link">
              <TextInput value={form.worksheetsLink} onChange={(e) => set("worksheetsLink", e.target.value)} />
            </Field>
            <Field label="Google Classroom link">
              <TextInput value={form.gcrLink} onChange={(e) => set("gcrLink", e.target.value)} />
            </Field>
          </FieldGroup>
        </>
      )}

      <div className="u2-grid2">
        <Field label="Service start date">
          <TextInput type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Service end date">
          <TextInput type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>

      <FieldGroup legend="Named links">
        <p className="u2-muted">Free-form, named (for example a Book service with a &quot;Questions&quot; link and an &quot;Answers&quot; link).</p>
        <LinkRows links={form.links} onChange={(next) => set("links", next)} />
      </FieldGroup>

      {isRoleBasedService ? (
        <>
          <FieldGroup legend="Rates">
            <RateRows rates={form.flatRates} onChange={(next) => set("flatRates", next)} />
          </FieldGroup>
          <FieldGroup legend="Recurring occurrences">
            <OccurrenceRows occurrences={form.flatOccurrences} people={roleUsers} onChange={(next) => set("flatOccurrences", next)} />
          </FieldGroup>
        </>
      ) : (
        <FieldGroup legend="Optional components">
          <p className="u2-muted">For example distinct exam papers within one subject. Most subjects need just one, left unnamed.</p>
          {form.components.map((c, ci) => (
            <div key={c.componentId ?? ci} className="u2-box">
              <div className="u2-inline">
                <Field label="Component name">
                  <TextInput placeholder="optional, e.g. Pure Mathematics 1" value={c.componentName} onChange={(e) => set("components", setAt(form.components, ci, { ...c, componentName: e.target.value }))} />
                </Field>
                {form.components.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => set("components", removeAt(form.components, ci))}>
                    ✕ Component
                  </Button>
                )}
              </div>
              {c.batches.map((b, bi) => {
                const setBatch = (next: BatchForm) => set("components", setAt(form.components, ci, { ...c, batches: setAt(c.batches, bi, next) }));
                return (
                  <div key={b.batchId ?? bi} className="u2-box u2-box--inner">
                    <div className="u2-grid3">
                      <Field label={isAdmissions ? "Academic session" : "Batch name"}>
                        {isAdmissions ? <Combobox value={b.batchName} onChange={(v) => setBatch({ ...b, batchName: v })} options={sessions.map((s) => ({ value: s, label: s }))} allowCustom placeholder="Academic session (e.g. Fall 2026)" /> : <TextInput placeholder="e.g. B14" value={b.batchName} onChange={(e) => setBatch({ ...b, batchName: e.target.value })} />}
                      </Field>
                      <Field label="Batch start date">
                        <TextInput type="date" value={b.startDate} onChange={(e) => setBatch({ ...b, startDate: e.target.value })} />
                      </Field>
                      <Field label="Batch end date">
                        <TextInput type="date" value={b.endDate} onChange={(e) => setBatch({ ...b, endDate: e.target.value })} />
                      </Field>
                    </div>
                    {c.batches.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => set("components", setAt(form.components, ci, { ...c, batches: removeAt(c.batches, bi) }))}>
                        ✕ Batch
                      </Button>
                    )}
                    <FieldGroup legend="Rates">
                      <p className="u2-muted">Whoever enrolls in this batch picks one. A rate can be reserved for one group.</p>
                      <RateRows rates={b.rates} groups={form.group} onChange={(next) => setBatch({ ...b, rates: next })} />
                    </FieldGroup>
                    <FieldGroup legend="Recurring occurrences">
                      <OccurrenceRows occurrences={b.occurrences} people={teachers} onChange={(next) => setBatch({ ...b, occurrences: next })} />
                    </FieldGroup>
                  </div>
                );
              })}
              <Button variant="ghost" size="sm" onClick={() => set("components", setAt(form.components, ci, { ...c, batches: [...c.batches, emptyBatch()] }))}>
                + Add batch
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => set("components", [...form.components, emptyComponent()])}>
            + Add optional component
          </Button>
        </FieldGroup>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { DEPARTMENTS, CURRENCIES_FULL, FIXED_DEPARTMENT, ROLE_ELIGIBLE } from "@/lib/accountTypes";
import { TIMEZONE_GROUPS } from "@/lib/timezones";
import { Button } from "@/ui2/components/Button";
import { Combobox, type ComboOption } from "@/ui2/components/Combobox";
import { CheckField, Field, FieldGroup, TextArea, TextInput } from "@/ui2/components/Field";
import { PersonLink } from "@/ui2/components/PersonLink";
import { apiFetch } from "@/ui2/queries/client";
import type { UserRecord } from "@/ui2/queries/types";
import { TIMEZONE_TYPES, type FormValues } from "./accountForm";

const currencyOptions: ComboOption[] = CURRENCIES_FULL.map((c: { code: string; name: string }) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
const timezoneOptions: ComboOption[] = TIMEZONE_GROUPS.flatMap((g: { label: string; options: { value: string; label: string }[] }) => g.options.map((o) => ({ value: o.value, label: o.label, group: g.label })));
const departmentOptions: ComboOption[] = DEPARTMENTS.map((d: string) => ({ value: d, label: d }));

const fixedDepartment = (type: string): string | undefined => (FIXED_DEPARTMENT as Record<string, string>)[type];

export interface AccountFieldsProps {
  mode: "create" | "edit";
  userType: string;
  /** The account being edited (edit mode): for Converted status and the generate buttons. */
  user?: UserRecord;
  values: FormValues;
  set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  users: readonly UserRecord[];
}

/** One form for create and edit: which fields show depends only on the account type, exactly as in the classic forms. */
export function AccountFields({ mode, userType, user, values: v, set, users }: AccountFieldsProps) {
  const edit = mode === "edit";
  const roleEligible = ROLE_ELIGIBLE.includes(userType);
  const isStudent = userType === "Student";
  const students = useMemo(() => users.filter((u) => u.UserType === "Student"), [users]);

  return (
    <>
      <Field label="Name">
        <TextInput value={v.name} onChange={(e) => set("name", e.target.value)} required />
      </Field>

      {edit &&
        (user?.Status === "Converted" ? (
          <p className="u2-muted">Status: Converted (locked, set by the Convert action)</p>
        ) : (
          <Field label="Status">
            <Combobox value={v.status} onChange={(x) => set("status", x)} options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]} />
          </Field>
        ))}

      {edit && (
        <>
          <Field label="Username">
            <TextInput value={v.username} onChange={(e) => set("username", e.target.value)} required />
          </Field>
          <Field label="New password" hint="Leave blank to keep the current password.">
            <TextInput value={v.password} onChange={(e) => set("password", e.target.value)} autoComplete="off" />
          </Field>
        </>
      )}

      <Field label="Currency" hint="Invoice and paycheck totals are shown in this account's currency.">
        <Combobox value={v.currency} onChange={(x) => set("currency", x)} options={currencyOptions} />
      </Field>

      {userType === "Parent" && (
        <FieldGroup legend="Linked student(s)">
          <div className="u2-checks">
            {students.map((s) => (
              <CheckField key={s.UserID} label={s.Name} checked={v.studentIds.includes(s.UserID)} onChange={(on) => set("studentIds", on ? [...v.studentIds, s.UserID] : v.studentIds.filter((x) => x !== s.UserID))} />
            ))}
            {students.length === 0 && <p className="u2-muted">No students yet.</p>}
          </div>
        </FieldGroup>
      )}

      {roleEligible && (
        <>
          <Field label="Role">
            <TextInput value={v.role} placeholder="e.g. SM Assistant" onChange={(e) => set("role", e.target.value)} />
          </Field>
          <Field label="Passport / IC Number">
            <TextInput value={v.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} />
          </Field>
          <Field label="WhatsApp Number">
            <TextInput value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </>
      )}

      {userType === "Staff" && (
        <Field label="Department">
          <Combobox value={v.department} onChange={(x) => set("department", x)} options={departmentOptions} placeholder="Select department…" />
        </Field>
      )}
      {edit && fixedDepartment(userType) && <p className="u2-muted">Department: {fixedDepartment(userType)} (fixed for this account type)</p>}

      {["Staff", "Teacher"].includes(userType) && (
        <>
          <Field label="Work Folder URL (Google Drive)">
            <TextInput value={v.workFolderUrl} onChange={(e) => set("workFolderUrl", e.target.value)} />
          </Field>
          <Field label="Timesheet URL">
            <TextInput value={v.timesheetUrl} onChange={(e) => set("timesheetUrl", e.target.value)} />
          </Field>
        </>
      )}

      {isStudent && (
        <>
          <Field label="Course">
            <TextInput value={v.course} onChange={(e) => set("course", e.target.value)} />
          </Field>
          {edit && (
            <>
              <Field label="WhatsApp Number">
                <TextInput value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
              </Field>
              <Field label="Parent WhatsApp Number">
                <TextInput value={v.parentWhatsappNumber} onChange={(e) => set("parentWhatsappNumber", e.target.value)} />
              </Field>
              <Field label="Parent Email">
                <TextInput type="email" value={v.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="School">
                <TextInput value={v.school} onChange={(e) => set("school", e.target.value)} />
              </Field>
              <Field label="Location">
                <TextInput value={v.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Gender">
                <Combobox value={v.gender} onChange={(x) => set("gender", x)} options={["Male", "Female", "Other"].map((g) => ({ value: g, label: g }))} placeholder="Not set" />
              </Field>
              <Field label="Help wanted">
                <TextInput value={v.helpWanted} onChange={(e) => set("helpWanted", e.target.value)} />
              </Field>
              <Field label="Subjects">
                <TextInput value={v.subjects} onChange={(e) => set("subjects", e.target.value)} />
              </Field>
              <ReferrerField selfId={user?.UserID ?? ""} users={users} name={v.referrerName} userId={v.referrerUserId} onChange={(name, id) => { set("referrerName", name); set("referrerUserId", id); }} />
              <Field label="Heard about us">
                <TextInput value={v.heardAbout} onChange={(e) => set("heardAbout", e.target.value)} />
              </Field>
              <Field label="Can score A* with guidance">
                <Combobox value={v.scoreAStar} onChange={(x) => set("scoreAStar", x)} options={["Yes", "No", "Maybe"].map((g) => ({ value: g, label: g }))} placeholder="Not set" />
              </Field>
              <Field label="Notes">
                <TextArea value={v.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
              <GenerateUrlField label="Timesheet URL" buttonLabel="Generate Timesheet URL" value={v.timesheetUrl} onChange={(x) => set("timesheetUrl", x)} endpoint="/api/timesheet-automator" body={() => ({ name: v.name, batch: v.batch, currency: v.currency, course: v.course, accountId: user?.UserID })} existedNote="This account already had a Timesheet, so the existing one was reused instead of creating a new one." />
              <GenerateUrlField label="Progress Tracker URL" buttonLabel="Generate Progress Tracker URL" value={v.progressTrackerUrl} onChange={(x) => set("progressTrackerUrl", x)} endpoint="/api/progress-tracker-automator" body={() => ({ name: v.name, batch: v.batch, accountId: user?.UserID })} existedNote="This account already had a Progress Tracker, so the existing one was reused instead of creating a new one." />
              <FieldGroup legend="Onboarding tracker (private, not shown to the student)">
                <div className="u2-checks">
                  <CheckField label="Group sent" checked={v.groupSent} onChange={(x) => set("groupSent", x)} />
                  <CheckField label="GCR sent" checked={v.gcrSent} onChange={(x) => set("gcrSent", x)} />
                  <CheckField label="Schedule sent" checked={v.scheduleSent} onChange={(x) => set("scheduleSent", x)} />
                </div>
              </FieldGroup>
            </>
          )}
        </>
      )}

      {["Student", "Teacher"].includes(userType) && (
        <Field label="Batch">
          <TextInput value={v.batch} onChange={(e) => set("batch", e.target.value)} />
        </Field>
      )}

      {TIMEZONE_TYPES.includes(userType) && (
        <Field label="Timezone">
          <Combobox value={v.timezone} onChange={(x) => set("timezone", x)} options={timezoneOptions} />
        </Field>
      )}
    </>
  );
}

function ReferrerField({ selfId, users, name, userId, onChange }: { selfId: string; users: readonly UserRecord[]; name: string; userId: string; onChange: (name: string, id: string) => void }) {
  const people = useMemo(() => users.filter((u) => u.UserID !== selfId).map((u) => ({ id: u.UserID, name: u.Name, suffix: u.UserType })), [users, selfId]);
  return <PersonLink legend="Referrer" nameLabel="Referrer name" people={people} name={name} userId={userId} onChange={onChange} />;
}

/** A URL field with a button that creates the Drive file (idempotent per account on the server) and fills the field. Does not save the account. */
function GenerateUrlField({ label, buttonLabel, value, onChange, endpoint, body, existedNote }: { label: string; buttonLabel: string; value: string; onChange: (v: string) => void; endpoint: string; body: () => Record<string, unknown>; existedNote: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await apiFetch<{ url: string; alreadyExisted?: boolean }>(endpoint, { method: "POST", body: body() });
      onChange(res.url);
      if (res.alreadyExisted) setNote(existedNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Field label={label} error={error} hint={note || undefined}>
      <div className="u2-inline">
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
        <Button variant="ghost" loading={busy} onClick={() => void run()}>
          {buttonLabel}
        </Button>
      </div>
    </Field>
  );
}

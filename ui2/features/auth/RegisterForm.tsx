"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { INTAKE_COUNTRIES } from "@/lib/cognitoCountries";
import { Button, LinkButton } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { CheckField, Field, FieldGroup, TextArea, TextInput } from "@/ui2/components/Field";
import { apiFetch } from "@/ui2/queries/client";
import { AuthFrame } from "./AuthFrame";
import { APPLY_AS, HEARD_OPTIONS, HELP_OPTIONS, INTL_PHONE_PATTERN, REQUESTED_TYPE_LABEL, SCORE_OPTIONS, STUDYING_OPTIONS, SUBJECT_OPTIONS, buildRegisterForm, validateRegister, type RegisterValues } from "./registerLogic";

function Checks({ legend, options, selected, onChange, other, onOther, required }: { legend: string; options: readonly string[]; selected: string[]; onChange: (next: string[]) => void; other?: string; onOther?: (v: string) => void; required?: boolean }) {
  return (
    <FieldGroup legend={`${legend}${required ? " *" : ""}`}>
      <div className="u2-checks">
        {options.map((o) => (
          <CheckField key={o} label={o} checked={selected.includes(o)} onChange={(on) => onChange(on ? [...selected, o] : selected.filter((x) => x !== o))} />
        ))}
      </div>
      {onOther && (
        <Field label="Other">
          <TextInput value={other ?? ""} onChange={(e) => onOther(e.target.value)} />
        </Field>
      )}
    </FieldGroup>
  );
}

export function RegisterForm() {
  const preset = useSearchParams().get("requestedType");
  const [v, setV] = useState<RegisterValues>({
    requestedType: preset && REQUESTED_TYPE_LABEL[preset] ? preset : "Trial", firstName: "", lastName: "", fullName: "", email: "", whatsappNumber: "", gender: "", location: "", parentNumber: "", parentEmail: "", schoolName: "",
    studying: [], otherStudying: "", help: [], otherHelp: "", subjects: [], otherSubjects: "", referrer: "", heardAbout: [], couponCode: "", scoreAStar: "", why: "", resume: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof RegisterValues>(k: K, val: RegisterValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const student = v.requestedType === "Trial";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = validateRegister(v);
    if (problem) return setError(problem);
    setLoading(true);
    try {
      await apiFetch("/api/register", { method: "POST", body: buildRegisterForm(v) });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted)
    return (
      <AuthFrame title="Application submitted" intro={`Management will review your request. If approved, you'll be given login credentials separately to book a ${REQUESTED_TYPE_LABEL[v.requestedType] || v.requestedType.toLowerCase()} slot.`}>
        <Link href="/v2/login" className="u2-pill">Back to sign in</Link>
      </AuthFrame>
    );

  return (
    <AuthFrame title="Apply" intro="Tell us a little about you. Management reviews every application." footer={<>Already have an account? <LinkButton href="/v2/login">Sign in</LinkButton></>}>
      <form className="u2-form" onSubmit={submit}>
        <Field label="I'm applying as"><Combobox value={v.requestedType} onChange={(x) => set("requestedType", x)} options={APPLY_AS} /></Field>
        {student ? (
          <div className="u2-grid2">
            <Field label="Student first name *"><TextInput required value={v.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First" /></Field>
            <Field label="Student last name *"><TextInput required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last" /></Field>
          </div>
        ) : (
          <Field label="Full name *"><TextInput required value={v.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
        )}
        {student && (
          <div className="u2-grid2">
            <Field label="Gender"><Combobox value={v.gender} onChange={(x) => set("gender", x)} placeholder="Select…" options={["Male", "Female", "Other"].map((g) => ({ value: g, label: g }))} /></Field>
            <Field label="Location"><Combobox value={v.location} onChange={(x) => set("location", x)} placeholder="Select…" options={INTAKE_COUNTRIES.map((c: string) => ({ value: c, label: c }))} /></Field>
          </div>
        )}
        <Field label={student ? "WhatsApp Number (include country code!) *" : "WhatsApp number *"} hint="Start with + and the country code, for example +44 7000 000000">
          <TextInput type="tel" inputMode="tel" autoComplete="tel" required pattern={INTL_PHONE_PATTERN} title="Start with + and the country code, for example +44 7000 000000" value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
        </Field>
        <Field label={student ? "Your email *" : "Email *"}><TextInput type="email" required value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
        {student ? (
          <>
            <Field label="Parent's Contact Number *" hint="Start with + and the country code.">
              <TextInput type="tel" inputMode="tel" required pattern={INTL_PHONE_PATTERN} title="Start with + and the country code, for example +44 7000 000000" value={v.parentNumber} onChange={(e) => set("parentNumber", e.target.value)} />
            </Field>
            <Field label="Parent's Email (optional)"><TextInput type="email" value={v.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} /></Field>
            <Field label="School Name (optional)"><TextInput value={v.schoolName} onChange={(e) => set("schoolName", e.target.value)} /></Field>
            <Checks legend="What are you studying?" required options={STUDYING_OPTIONS} selected={v.studying} onChange={(n) => set("studying", n)} other={v.otherStudying} onOther={(x) => set("otherStudying", x)} />
            <Checks legend="How shall we help?" options={HELP_OPTIONS} selected={v.help} onChange={(n) => set("help", n)} other={v.otherHelp} onOther={(x) => set("otherHelp", x)} />
            <Checks legend="Subjects" options={SUBJECT_OPTIONS} selected={v.subjects} onChange={(n) => set("subjects", n)} other={v.otherSubjects} onOther={(x) => set("otherSubjects", x)} />
            <Field label="Who referred you? (Referrer Name)"><TextInput placeholder="Enter name!" value={v.referrer} onChange={(e) => set("referrer", e.target.value)} /></Field>
            <Checks legend="How did you hear about us?" required options={HEARD_OPTIONS} selected={v.heardAbout} onChange={(n) => set("heardAbout", n)} />
            <Field label="Coupon Code (optional)"><TextInput value={v.couponCode} onChange={(e) => set("couponCode", e.target.value)} /></Field>
            <FieldGroup legend="Do you feel you can score A* with proper guidance?">
              <div className="u2-checks" role="radiogroup" aria-label="Can score A*">
                {SCORE_OPTIONS.map((o) => (
                  <label key={o} className="u2-check"><input type="radio" name="scoreAStar" checked={v.scoreAStar === o} onChange={() => set("scoreAStar", o)} /> {o}</label>
                ))}
              </div>
            </FieldGroup>
          </>
        ) : (
          <>
            <Field label="Why DivergenCIE? (optional)"><TextArea rows={4} value={v.why} onChange={(e) => set("why", e.target.value)} /></Field>
            <Field label="Resume"><input type="file" accept=".pdf,.doc,.docx" onChange={(e) => set("resume", e.target.files?.[0] ?? null)} /></Field>
          </>
        )}
        {error && <p role="alert" className="u2-form__error">{error}</p>}
        <Button type="submit" variant="primary" loading={loading}>Submit application</Button>
      </form>
    </AuthFrame>
  );
}

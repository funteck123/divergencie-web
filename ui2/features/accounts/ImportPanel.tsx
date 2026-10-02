"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buildCreateBody, buildFillPatch, findMatches, findReferrer, parseImport } from "@/lib/accountImport";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { TextArea } from "@/ui2/components/Field";
import { apiFetch } from "@/ui2/queries/client";
import type { Credentials, UserRecord } from "@/ui2/queries/types";
import { useCreateUser, usePatchUser } from "@/ui2/queries/users";

interface Parsed {
  ok: boolean;
  userType: string;
  fields: Record<string, string>;
  warnings: string[];
  timezone?: string;
  currency?: string;
}
interface Fill {
  patch: { userId: string } & Record<string, unknown>;
  changes: { label?: string; to: string }[];
  kept: { label?: string; existing: string; imported: string }[];
  nothingToDo: boolean;
}

const IMPORT_LABELS: Record<string, string> = {
  name: "Name", gender: "Gender", location: "Location", whatsapp: "WhatsApp number", email: "Email",
  parentWhatsapp: "Parent WhatsApp number", parentEmail: "Parent email", course: "Studying", help: "Help wanted",
  subjects: "Subjects", referrer: "Referrer", heardAbout: "Heard about us", scoreAStar: "Can score A*", school: "School",
  coupon: "Coupon", passport: "Passport / IC number", role: "Role", department: "Department", batch: "Batch",
  timezone: "Timezone", currency: "Currency", notes: "Notes",
};

/**
 * Import from pasted text (TKT-0319): reads the text as you type, saves nothing until a button is pressed, offers an
 * existing matching account for an "add info" update that only fills blanks. Logic is the classic one (lib/accountImport).
 */
export function ImportPanel({ userType, users, defaults, onCreated }: { userType: string; users: readonly UserRecord[]; defaults: { currency: string; timezone: string }; onCreated: (credentials: Credentials, user: UserRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const create = useCreateUser();
  const patch = usePatchUser();

  const parsed = useMemo(() => (text.trim() ? (parseImport(text, userType) as unknown as Parsed) : null), [text, userType]);
  const matches = useMemo(() => (parsed && parsed.ok ? findMatches(users, parsed) : []), [users, parsed]);
  const readAs: string = parsed ? parsed.userType : userType;
  const sameType = users.filter((u) => u.UserType === readAs);
  const selected = choice && (choice === "new" || sameType.some((u) => u.UserID === choice)) ? choice : (matches[0]?.user.UserID as string | undefined) || "new";
  const target = selected === "new" ? null : sameType.find((u) => u.UserID === selected) || null;
  const pickedByHand = target && !matches.some((m: { user: UserRecord }) => m.user.UserID === selected);
  const referrer = parsed && parsed.fields.referrer ? (findReferrer(users, parsed.fields.referrer) as { userId: string; name: string } | null) : null;
  const fill = parsed && target ? (buildFillPatch(target, parsed, { referrer }) as unknown as Fill) : null;
  const shown: [string, string][] = parsed ? Object.entries(parsed.fields).filter(([, v]) => v) : [];

  async function run() {
    setError("");
    setSaving(true);
    try {
      if (target && fill) {
        await patch.mutateAsync({ userId: fill.patch.userId, fields: Object.fromEntries(Object.entries(fill.patch).filter(([k]) => k !== "userId")) });
        toast.success(`Added to ${target.UserID} ${target.Name}.`);
      } else {
        const res = await create.mutateAsync(buildCreateBody(parsed, { ...defaults, referrer }));
        onCreated(res.credentials, res.user);
        toast.success(`Created ${res.user.UserID} ${res.user.Name}.`);
      }
      setText("");
      setChoice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }
  void apiFetch; // (kept imported for symmetry with other panels; all writes go through the mutations above)

  return (
    <div className="u2-import">
      <Button variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Import from form ▴" : "Import from form ▾"}
      </Button>
      {open && (
        <div className="u2-import__body">
          <TextArea rows={8} aria-label="Pasted form entry" className="u2-input--mono" placeholder={userType === "Student" ? "Paste the Cognito Forms entry" : "Name: ...\nEmail: ...\nWhatsApp: ...\nRole: ..."} value={text} onChange={(e) => setText(e.target.value)} />
          {parsed && (
            <div className="u2-import__preview">
              {parsed.userType !== userType && <p className="u2-muted">{`Read as a ${parsed.userType} form.`}</p>}
              {parsed.warnings.map((w: string) => (
                <p key={w} className="u2-form__error">
                  {w}
                </p>
              ))}
              {shown.length > 0 && (
                <dl className="u2-import__facts">
                  {shown.map(([k, v]) => (
                    <div key={k}>
                      <dt>{IMPORT_LABELS[k] || k}</dt>
                      <dd>
                        {v}
                        {k === "referrer" && referrer ? ` (linked to ${referrer.userId} ${referrer.name})` : ""}
                      </dd>
                    </div>
                  ))}
                  {parsed.timezone && (
                    <div>
                      <dt>Timezone, currency</dt>
                      <dd>
                        {parsed.timezone}
                        {parsed.currency ? `, ${parsed.currency}` : ""}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              {parsed.ok && (
                <div className="u2-import__targets" role="radiogroup" aria-label="Where to save">
                  {matches.map((m: { user: UserRecord; reasons: string[] }) => (
                    <label key={m.user.UserID} className="u2-check">
                      <input type="radio" name="import-target" checked={selected === m.user.UserID} onChange={() => setChoice(m.user.UserID)} />
                      <span>
                        Add to {m.user.UserID} {m.user.Name} <span className="u2-muted">({m.reasons.map((r) => (r === "similar name" ? r : `same ${r}`)).join(", ")})</span>
                      </span>
                    </label>
                  ))}
                  {pickedByHand && target && (
                    <label className="u2-check">
                      <input type="radio" name="import-target" checked readOnly />
                      <span>
                        Add to {target.UserID} {target.Name} <span className="u2-muted">(picked by hand)</span>
                      </span>
                    </label>
                  )}
                  <label className="u2-check">
                    <input type="radio" name="import-target" checked={selected === "new"} onChange={() => setChoice("new")} />
                    Create a new account
                  </label>
                  <Combobox value="" aria-label="Add to an existing account" placeholder="Add to a different existing account…" options={sameType.map((u) => ({ value: u.UserID, label: `${u.Name} (${u.UserID})` }))} onChange={(v) => v && setChoice(v)} />
                </div>
              )}
              {fill && (
                <div className="u2-import__fill">
                  {fill.changes.map((c) => (
                    <p key={c.label ?? c.to}>
                      <strong>{c.label}</strong>:{" "}
                      {c.to.split("\n").map((line, i) => (
                        <span key={i} className="u2-block">
                          {line}
                        </span>
                      ))}
                    </p>
                  ))}
                  {fill.kept.map((k) => (
                    <p key={k.label ?? k.existing} className="u2-muted">{`${k.label}: kept "${k.existing}", form says "${k.imported}"`}</p>
                  ))}
                  {fill.nothingToDo && <p className="u2-muted">Nothing new to add.</p>}
                </div>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="u2-form__error">
              {error}
            </p>
          )}
          <Button variant="primary" loading={saving} disabled={!parsed || !parsed.ok || !!(target && fill?.nothingToDo)} disabledReason="Paste an entry the reader understands first." onClick={() => void run()}>
            {target ? `Add info to ${target.UserID}` : "Create account from form"}
          </Button>
        </div>
      )}
    </div>
  );
}

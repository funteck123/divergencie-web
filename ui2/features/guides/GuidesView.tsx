"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GUIDE_AUDIENCES } from "@/lib/accountTypes";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { CheckField, Field, FieldGroup, TextInput } from "@/ui2/components/Field";
import { useCreateGuide, useDeleteGuide, useFlipToggle, useGuides, useMcqConfig, useResourceToggles, useSaveMcqConfig, useUpdateGuide } from "@/ui2/queries/guides";
import type { GuideRecord } from "@/ui2/queries/types";
import "@/ui2/features/accounts/accounts.css";
import "@/ui2/features/services/services.css";

type Audience = { key: string; label: string; userTypes: string[] };
const AUDIENCES = GUIDE_AUDIENCES as Audience[];

const RESOURCE_TOGGLE_LABELS: Record<string, string> = {
  recordings: "Recordings", syllabus: "Syllabus", worksheets: "Worksheets", gcr: "Google Classroom", timesheet: "Timesheet", progressTracker: "Progress Tracker",
};

export function GuidesView() {
  const guides = useGuides();
  const create = useCreateGuide();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const list = (guides.data ?? []).filter((g) => !search.trim() || g.Name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <section className="u2-accounts">
      <h1>Guides and settings</h1>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
      <div className="u2-split">
        <ResourceToggles />
        <McqConfig />
      </div>
      <section className="u2-box">
        <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Add a Guide</h2>
        <GuideForm submitLabel="Add Guide" onSubmit={async (v) => { setError(""); try { await create.mutateAsync(v); toast.success(`Added ${v.name}.`); } catch (e) { setError(e instanceof Error ? e.message : "Could not add."); throw e; } }} resetOnSave />
      </section>
      <section className="u2-box">
        <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Existing Guides</h2>
        {(guides.data ?? []).length === 0 ? (
          <p className="u2-muted">{guides.isPending ? "Loading…" : "No guides yet. Add one above."}</p>
        ) : (
          <>
            <input type="search" className="u2-search" placeholder="Search guide name…" aria-label="Search guides" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="u2-rows">
              {list.map((g) => (
                <GuideRow key={g.GuideID} guide={g} />
              ))}
              {list.length === 0 && <p className="u2-muted">No matches.</p>}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function ResourceToggles() {
  const toggles = useResourceToggles();
  const flip = useFlipToggle();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  return (
    <section className="u2-box">
      <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>Student Resources Tools</h2>
      <p className="u2-muted" style={{ margin: 0 }}>Turn any Resources button on or off for every student at once, without a code change.</p>
      {toggles.error && <p role="alert" className="u2-form__error">{toggles.error.message}</p>}
      {!toggles.data ? (
        <p className="u2-muted">Loading…</p>
      ) : (
        <div className="u2-checks">
          {Object.entries(RESOURCE_TOGGLE_LABELS).map(([key, label]) => (
            <CheckField
              key={key}
              label={label}
              checked={!!toggles.data?.[key]}
              onChange={async (on) => {
                setBusyKey(key);
                try { await flip.mutateAsync({ key, value: on }); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not change."); } finally { setBusyKey(null); }
              }}
            />
          ))}
          {busyKey && <span className="u2-muted">Saving…</span>}
        </div>
      )}
    </section>
  );
}

function McqConfig() {
  const cfg = useMcqConfig();
  const save = useSaveMcqConfig();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const saved = cfg.data ?? "";
  const url = draft ?? saved;
  return (
    <section className="u2-box">
      <h2 style={{ margin: 0, fontSize: "var(--u2-text-xl)" }}>MCQ Digitizer Extraction Service</h2>
      <p className="u2-muted" style={{ margin: 0 }}>Current Cloudflare tunnel URL for the extraction service. Update this whenever the tunnel restarts. Every student request routes through this one value, no redeploy needed.</p>
      <Field label="Extraction service tunnel URL" error={error}>
        <div className="u2-inline">
          <TextInput placeholder="https://random-words.trycloudflare.com" value={url} onChange={(e) => setDraft(e.target.value)} />
          <Button variant="primary" loading={save.isPending} disabled={url === saved} disabledReason="Change the URL first." onClick={async () => { setError(""); try { await save.mutateAsync(url); setDraft(null); toast.success("Saved."); } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } }}>
            Save
          </Button>
        </div>
      </Field>
    </section>
  );
}

interface GuideValues { name: string; url: string; userTypes: string[] }

function GuideForm({ initial, onSubmit, submitLabel, resetOnSave }: { initial?: GuideRecord; onSubmit: (v: GuideValues) => Promise<void>; submitLabel: string; resetOnSave?: boolean }) {
  const [name, setName] = useState(initial?.Name || "");
  const [url, setUrl] = useState(initial?.Url || "");
  const [keys, setKeys] = useState<string[]>(AUDIENCES.filter((a) => a.userTypes.every((t) => initial?.UserTypes?.includes(t))).map((a) => a.key));
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name, url, userTypes: AUDIENCES.filter((a) => keys.includes(a.key)).flatMap((a) => a.userTypes) });
      if (resetOnSave) { setName(""); setUrl(""); setKeys([]); }
    } catch {
      /* the caller shows the message */
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="u2-form">
      <Field label="Button name"><TextInput placeholder="e.g. Student Handbook" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="URL"><TextInput type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required /></Field>
      <FieldGroup legend="Show on">
        <div className="u2-checks">
          {AUDIENCES.map((a) => (
            <CheckField key={a.key} label={a.label} checked={keys.includes(a.key)} onChange={(on) => setKeys((p) => (on ? [...p, a.key] : p.filter((k) => k !== a.key)))} />
          ))}
        </div>
      </FieldGroup>
      <div className="u2-form__actions">
        <Button type="submit" variant="primary" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function GuideRow({ guide }: { guide: GuideRecord }) {
  const update = useUpdateGuide();
  const del = useDeleteGuide();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const labels = AUDIENCES.filter((a) => a.userTypes.some((t) => guide.UserTypes?.includes(t))).map((a) => a.label);
  if (editing)
    return (
      <div className="u2-box u2-box--inner">
        <GuideForm initial={guide} submitLabel="Save" onSubmit={async (v) => { await update.mutateAsync({ guideId: guide.GuideID, patch: v }); setEditing(false); toast.success("Guide saved."); }} />
        <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    );
  return (
    <div className="u2-box u2-box--inner" style={{ gridTemplateColumns: "1fr auto", alignItems: "center" }}>
      <div>
        <strong className="u2-strong">{guide.Name}</strong>
        <div className="u2-muted">{guide.Url}</div>
        <div className="u2-muted">Shown on: {labels.join(", ") || "none"}</div>
      </div>
      <span className="u2-rowactions">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        <Button size="sm" variant="ghost" className="u2-danger-text" onClick={() => setRemoving(true)}>Delete</Button>
      </span>
      <ConfirmDialog open={removing} onOpenChange={setRemoving} title="Delete guide?" description={`Delete the guide "${guide.Name}"?`} confirmLabel="Yes, delete" danger onConfirm={async () => { await del.mutateAsync(guide.GuideID); toast.success("Guide deleted."); }} />
    </div>
  );
}

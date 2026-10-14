"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { Field, TextArea, TextInput } from "@/ui2/components/Field";
import { Skeleton } from "@/ui2/components/Skeleton";
import { useDeleteTemplate, useSaveTemplate, useTemplates } from "@/ui2/queries/templates";
import type { TemplateRecord } from "@/ui2/queries/types";
import "@/ui2/features/accounts/accounts.css";
import { CopyButton } from "./CopyButton";
import "./templates.css";

/** Reusable messages (payment reminder, payment acknowledged ...). Everyone allowed here copies; `canEdit` (Management) also adds, edits and deletes. */
export function TemplateList({ canEdit }: { canEdit: boolean }) {
  const templates = useTemplates();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TemplateRecord | null>(null);
  const del = useDeleteTemplate();
  const rows = templates.data ?? [];
  if (templates.error) return <p role="alert" className="u2-errorbox">Could not load the templates: {templates.error.message}</p>;
  if (!templates.data) return <Skeleton height={120} />;
  return (
    <>
      {rows.length === 0 && <p className="u2-muted">{canEdit ? "No templates yet. Add the first one above." : "No templates yet. Management adds them."}</p>}
      <div className="u2-rows">
        {rows.map((t) =>
          editing === t.TemplateID ? (
            <TemplateForm key={t.TemplateID} initial={t} onDone={() => setEditing(null)} />
          ) : (
            <article key={t.TemplateID} className="u2-tpl" aria-label={t.Name}>
              <header className="u2-tpl__head">
                <h3>{t.Name}</h3>
                <span className="u2-rowactions">
                  <CopyButton text={t.Body} label={t.Name} />
                  {canEdit && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(t.TemplateID)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(t)}>Delete</Button>
                    </>
                  )}
                </span>
              </header>
              <p className="u2-tpl__body">{t.Body}</p>
            </article>
          ),
        )}
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this template?"
        description={deleting ? `"${deleting.Name}" is removed for everyone. This cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.TemplateID);
          toast.success(`Deleted ${deleting.Name}.`);
          setDeleting(null);
        }}
      />
    </>
  );
}

export function TemplateForm({ initial, onDone }: { initial?: TemplateRecord; onDone?: () => void }) {
  const save = useSaveTemplate();
  const [name, setName] = useState(initial?.Name ?? "");
  const [body, setBody] = useState(initial?.Body ?? "");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await save.mutateAsync({ templateId: initial?.TemplateID, name, body });
      toast.success(initial ? `Saved ${name}.` : `Added ${name}.`);
      if (!initial) { setName(""); setBody(""); }
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }
  return (
    <form onSubmit={submit} className="u2-form u2-tpl u2-tpl--form" aria-label={initial ? `Edit ${initial.Name}` : "Add a template"}>
      <Field label="Template name">
        <TextInput value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Payment reminder" />
      </Field>
      <Field label="Text">
        <TextArea value={body} maxLength={4000} rows={6} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder="Dear parent, this is a reminder that the fee for ..." />
      </Field>
      {error && <p role="alert" className="u2-form__error">{error}</p>}
      <div className="u2-form__actions">
        <Button type="submit" variant="primary" loading={save.isPending}>{initial ? "Save" : "Add template"}</Button>
        {initial && <Button variant="ghost" disabled={save.isPending} onClick={onDone}>Cancel</Button>}
      </div>
    </form>
  );
}

export function TemplatesView() {
  return (
    <section className="u2-accounts">
      <h1>Message templates</h1>
      <p className="u2-muted">Texts staff send again and again, for example a payment reminder or a payment acknowledgement. Teachers and Staff can copy them from their own page. Only Management changes them.</p>
      <section className="u2-box">
        <h2>Add a template</h2>
        <TemplateForm />
      </section>
      <section className="u2-box">
        <h2>All templates</h2>
        <TemplateList canEdit />
      </section>
    </section>
  );
}

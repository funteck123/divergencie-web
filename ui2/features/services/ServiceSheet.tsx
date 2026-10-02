"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { Sheet } from "@/ui2/components/Sheet";
import type { ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { useSaveService } from "@/ui2/queries/services";
import { ServiceFormFields } from "./ServiceFormFields";
import { buildServiceBody, effectiveName, emptyServiceForm, loadServiceForm, validateServiceForm, type ServiceForm } from "./serviceForm";
import "./services.css";

export type SheetTarget = { mode: "create" } | { mode: "edit"; service: ServiceRecord } | null;

export function ServiceSheet({ target, users, onClose }: { target: SheetTarget; users: readonly UserRecord[]; onClose: () => void }) {
  const title = target?.mode === "edit" ? `Edit service ${target.service.ServiceID}` : "New service";
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()} title={title} subtitle={target?.mode === "edit" ? target.service.Name : undefined} wide>
      {target && <Editor key={target.mode === "edit" ? target.service.ServiceID : "new"} target={target} users={users} onClose={onClose} />}
    </Sheet>
  );
}

function Editor({ target, users, onClose }: { target: NonNullable<SheetTarget>; users: readonly UserRecord[]; onClose: () => void }) {
  const [form, setForm] = useState<ServiceForm>(() => (target.mode === "edit" ? loadServiceForm(target.service) : emptyServiceForm()));
  const [error, setError] = useState("");
  const save = useSaveService();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateServiceForm(form);
    if (problem) return setError(problem);
    setError("");
    try {
      await save.mutateAsync({ serviceId: form.serviceId, body: buildServiceBody(form) });
      toast.success(form.serviceId ? `Saved ${effectiveName(form)}.` : `Created ${effectiveName(form)}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the service.");
    }
  }

  return (
    <form onSubmit={submit} className="u2-form">
      <ServiceFormFields form={form} setForm={setForm} users={users} />
      {error && (
        <p role="alert" className="u2-form__error">
          {error}
        </p>
      )}
      <div className="u2-form__actions">
        <Button type="submit" variant="primary" loading={save.isPending}>
          {form.serviceId ? "Save changes" : "Create service"}
        </Button>
        <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

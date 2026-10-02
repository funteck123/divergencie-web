"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import type { UserRecord } from "@/ui2/queries/types";
import { useCreateUser } from "@/ui2/queries/users";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";
import { AccountFields } from "./AccountFields";
import { buildCreateBody, CREATABLE_TYPES, emptyCreateValues, type FormValues } from "./accountForm";
import { INTERVIEW_ACC_LABEL } from "./groups";
import { ImportPanel } from "./ImportPanel";

const typeOptions = CREATABLE_TYPES.map((t) => ({ value: t, label: INTERVIEW_ACC_LABEL[t] || t }));

export function CreateSheet({ open, defaultType, users, onClose }: { open: boolean; defaultType: string; users: readonly UserRecord[]; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="New account" subtitle="The username and a first password are generated for you.">
      {open && <CreateForm key={defaultType} defaultType={defaultType} users={users} onClose={onClose} />}
    </Sheet>
  );
}

function CreateForm({ defaultType, users, onClose }: { defaultType: string; users: readonly UserRecord[]; onClose: () => void }) {
  const [userType, setUserType] = useState(defaultType);
  const [values, setValues] = useState<FormValues>(emptyCreateValues);
  const [error, setError] = useState("");
  const create = useCreateUser();
  const { remember } = useIssued();
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((p) => ({ ...p, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await create.mutateAsync(buildCreateBody(userType, values));
      remember(res.user.UserID, res.credentials);
      toast.success(`Created ${res.user.UserID} ${res.user.Name}. Copy the credentials from the box above the table.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    }
  }

  return (
    <>
      <ImportPanel
        userType={userType}
        users={users}
        defaults={{ currency: values.currency, timezone: values.timezone }}
        onCreated={(credentials, user) => {
          remember(user.UserID, credentials);
          onClose();
        }}
      />
      <form onSubmit={submit} className="u2-form">
        <Field label="Account type">
          <Combobox value={userType} onChange={setUserType} options={typeOptions} />
        </Field>
        <AccountFields mode="create" userType={userType} values={values} set={set} users={users} />
        {error && (
          <p role="alert" className="u2-form__error">
            {error}
          </p>
        )}
        <div className="u2-form__actions">
          <Button type="submit" variant="primary" loading={create.isPending}>
            Create account
          </Button>
          <Button variant="ghost" disabled={create.isPending} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

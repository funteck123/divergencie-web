"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { Sheet } from "@/ui2/components/Sheet";
import type { UserRecord } from "@/ui2/queries/types";
import { usePatchUser } from "@/ui2/queries/users";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";
import { AccountFields } from "./AccountFields";
import { buildPatchFields, initialValues, type FormValues } from "./accountForm";

/** Edit one account in a side panel. The form is keyed by the account, so opening another account starts from its own values. */
export function AccountSheet({ user, users, onClose }: { user: UserRecord | null; users: readonly UserRecord[]; onClose: () => void }) {
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()} title={user ? `Edit ${user.Name}` : "Edit account"} subtitle={user ? `${user.UserID} · ${user.UserType}` : undefined}>
      {user && <EditForm key={user.UserID} user={user} users={users} onClose={onClose} />}
    </Sheet>
  );
}

function EditForm({ user, users, onClose }: { user: UserRecord; users: readonly UserRecord[]; onClose: () => void }) {
  const [values, setValues] = useState<FormValues>(() => initialValues(user));
  const patch = usePatchUser();
  const { remember } = useIssued();
  const [error, setError] = useState("");
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((p) => ({ ...p, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fields = buildPatchFields(user, values);
    try {
      const res = await patch.mutateAsync({ userId: user.UserID, fields });
      // The new plaintext password can only ever be shown from here: the server keeps a hash (TKT-0125, TKT-0137).
      if (res.credentials) remember(user.UserID, res.credentials);
      else if (typeof fields.password === "string" && fields.password) remember(user.UserID, { username: String(fields.username ?? user.Username ?? ""), password: fields.password });
      toast.success(`Saved ${values.name}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <form id="account-edit-form" onSubmit={save} className="u2-form">
      <AccountFields mode="edit" userType={user.UserType} user={user} values={values} set={set} users={users} />
      {error && (
        <p role="alert" className="u2-form__error">
          {error}
        </p>
      )}
      <div className="u2-form__actions">
        <Button type="submit" variant="primary" loading={patch.isPending}>
          Save
        </Button>
        <Button variant="ghost" disabled={patch.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

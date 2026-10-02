"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import type { UserRecord } from "@/ui2/queries/types";
import { useDeleteUser } from "@/ui2/queries/users";
import "@/ui2/components/ConfirmDialog.css";

type Stage = "confirm" | "blocked" | "typed";

/**
 * Delete one account, same safety ladder as classic (TKT-0278): a plain delete first; if the server refuses because the
 * account has history, the reason is shown and a force delete (cascade, backed up first, restorable) needs the account
 * name typed exactly.
 */
export function DeleteAccountDialog({ user, onClose }: { user: UserRecord | null; onClose: () => void }) {
  return (
    <Dialog.Root open={!!user} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog" aria-describedby={undefined}>
          {user && <Body key={user.UserID} user={user} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({ user, onClose }: { user: UserRecord; onClose: () => void }) {
  const del = useDeleteUser();
  const [stage, setStage] = useState<Stage>("confirm");
  const [message, setMessage] = useState("");
  const [typed, setTyped] = useState("");

  async function run(force: boolean) {
    setMessage("");
    try {
      const res = await del.mutateAsync({ userId: user.UserID, force });
      toast.success(res.backupId ? `Deleted ${user.Name}. Backup ${res.backupId}, restorable from Deleted Accounts.` : `Deleted ${user.Name}.`);
      onClose();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete.");
      if (!force) setStage("blocked");
    }
  }

  return (
    <>
      <Dialog.Title className="u2-dialog__title">Delete {user.Name}?</Dialog.Title>
      {stage === "confirm" && <p className="u2-dialog__body">This removes the account. If it has no history the delete is final.</p>}
      {stage === "blocked" && (
        <>
          <p role="alert" className="u2-dialog__error">
            {message}
          </p>
          <p className="u2-dialog__body">A force delete removes every record tied to this account and cannot be undone from here.</p>
        </>
      )}
      {stage === "typed" && (
        <>
          <p className="u2-dialog__body">
            This permanently removes <strong>every</strong> record tied to &quot;{user.Name}&quot; (enrollments, billing, tickets, mistake and attempt history, and more). It is backed up first and restorable from Deleted Accounts.
          </p>
          <label className="u2-dialog__field">
            <span>
              Type <strong>{user.Name}</strong> to confirm
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {message && (
            <p role="alert" className="u2-dialog__error">
              {message}
            </p>
          )}
        </>
      )}
      <div className="u2-dialog__actions">
        <Button variant="ghost" disabled={del.isPending} onClick={onClose}>
          Cancel
        </Button>
        {stage === "confirm" && (
          <Button variant="danger" loading={del.isPending} onClick={() => void run(false)}>
            Delete
          </Button>
        )}
        {stage === "blocked" && (
          <Button variant="danger" onClick={() => { setTyped(""); setMessage(""); setStage("typed"); }}>
            Force delete (cascade)
          </Button>
        )}
        {stage === "typed" && (
          <Button variant="danger" loading={del.isPending} disabled={typed.trim() !== user.Name} disabledReason="Type the account name exactly first." onClick={() => void run(true)}>
            Force delete
          </Button>
        )}
      </div>
    </>
  );
}

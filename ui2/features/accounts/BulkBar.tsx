"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import type { UserRecord } from "@/ui2/queries/types";
import { useDeleteUser, usePatchUser } from "@/ui2/queries/users";
import { useIssued } from "@/ui2/features/management/IssuedCredentials";

export const BULK_MAX = 25;

type Pending = "reset" | "delete" | null;

/**
 * Actions for the ticked rows. Each action sends the same single-account request the row menu sends, one after
 * the other, so every change is audit-logged by the server per account. Limited to 25 rows. Delete asks for a typed
 * confirmation and never forces (an account with history is reported, not cascaded).
 * Edit and Log in as are single-account actions and stay disabled here, with the reason.
 */
export function BulkBar({ selected, onClear }: { selected: readonly UserRecord[]; onClear: () => void }) {
  const patch = usePatchUser();
  const del = useDeleteUser();
  const { remember } = useIssued();
  const [pending, setPending] = useState<Pending>(null);
  const [running, setRunning] = useState(false);
  const n = selected.length;
  const tooMany = n > BULK_MAX;
  const reason = tooMany ? `Select ${BULK_MAX} or fewer accounts.` : undefined;

  async function each(label: string, work: (u: UserRecord) => Promise<void>, targets: readonly UserRecord[] = selected) {
    setRunning(true);
    const failed: string[] = [];
    let ok = 0;
    for (const u of targets) {
      try {
        await work(u);
        ok++;
      } catch (e) {
        failed.push(`${u.Name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setRunning(false);
    if (failed.length === 0) toast.success(`${label}: ${ok} of ${targets.length} done.`);
    else toast.error(`${label}: ${ok} done, ${failed.length} failed.`, { description: failed.slice(0, 4).join("\n") });
    return ok;
  }

  const setStatus = (status: "Active" | "Inactive") => {
    const targets = selected.filter((u) => (u.Status === "Active" || u.Status === "Inactive") && u.Status !== status);
    if (targets.length === 0) return toast.info(`Nothing to change: every selected account is already ${status}.`);
    void each(status === "Active" ? "Activate" : "Deactivate", async (u) => {
      await patch.mutateAsync({ userId: u.UserID, fields: { status }, optimistic: { Status: status } });
    }, targets);
  };

  return (
    <div className="u2-bulk" role="region" aria-label="Actions for selected accounts">
      <strong>{n} selected</strong>
      <Button size="sm" variant="ghost" onDark disabled={tooMany} disabledReason={reason} loading={running} onClick={() => setStatus("Inactive")}>
        Deactivate
      </Button>
      <Button size="sm" variant="ghost" onDark disabled={tooMany} disabledReason={reason} loading={running} onClick={() => setStatus("Active")}>
        Activate
      </Button>
      <Button size="sm" variant="ghost" onDark disabled={tooMany} disabledReason={reason} onClick={() => setPending("reset")}>
        Reset password
      </Button>
      <Button size="sm" variant="ghost" onDark disabled title="Edit one account at a time" disabledReason="Edit works on one account at a time. Use the pencil on the row.">
        Edit
      </Button>
      <Button size="sm" variant="ghost" onDark disabled disabledReason="Log in as works on one account at a time. Use the arrow on the row.">
        Log in as
      </Button>
      <Button size="sm" variant="danger" disabled={tooMany} disabledReason={reason} onClick={() => setPending("delete")}>
        Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear selection
      </Button>

      <ConfirmDialog
        open={pending === "reset"}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Reset ${n} passwords?`}
        description={<NameList users={selected} tail="Each account gets a new generated password and the old one stops working. The new passwords show once, in the box above the table." />}
        confirmLabel="Reset passwords"
        danger
        onConfirm={async () => {
          const targets = selected.filter((u) => u.Username && !u.ConvertedToUserID);
          await each("Reset password", async (u) => {
            const res = await patch.mutateAsync({ userId: u.UserID, fields: { resetPassword: true } });
            if (res.credentials) remember(u.UserID, res.credentials);
          }, targets);
        }}
      />
      <ConfirmDialog
        open={pending === "delete"}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Delete ${n} accounts?`}
        description={<NameList users={selected} tail="An account with history (enrollments, billing, tickets) is not deleted; it is reported so you can handle it one by one." />}
        confirmLabel={`Delete ${n} accounts`}
        danger
        requireText={`DELETE ${n}`}
        onConfirm={async () => {
          const removed = await each("Delete", async (u) => {
            await del.mutateAsync({ userId: u.UserID, force: false });
          });
          if (removed > 0) onClear();
        }}
      />
    </div>
  );
}

function NameList({ users, tail }: { users: readonly UserRecord[]; tail: string }) {
  return (
    <>
      <ul className="u2-namelist">
        {users.map((u) => (
          <li key={u.UserID}>
            {u.Name} <span className="u2-muted">({u.UserID})</span>
          </li>
        ))}
      </ul>
      <p>{tail}</p>
    </>
  );
}

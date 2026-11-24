"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "@/ui2/components/Button";
import "@/ui2/components/ConfirmDialog.css";
import type { UserRecord } from "@/ui2/queries/types";

/**
 * TKT-0435: the row action "Copy welcome message". It asks first whether the password goes in. A password is stored only as a hash, so putting
 * it in means making a new one now: the old one stops working. Without it, the message tells the person to use the password they already have.
 * The text lands on the clipboard; if the browser refuses (it can, after the wait for the reset), the message shows here to copy by hand.
 */
export function WelcomeMessageDialog({ user, build, onClose }: { user: UserRecord | null; build: (u: UserRecord, includePassword: boolean) => Promise<string>; onClose: () => void }) {
  const [busy, setBusy] = useState<"" | "with" | "without">("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  async function run(includePassword: boolean) {
    if (!user) return;
    setBusy(includePassword ? "with" : "without");
    setError("");
    try {
      const text = await build(user, includePassword);
      try {
        await navigator.clipboard.writeText(text);
        close();
      } catch {
        setManual(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }
  function close() {
    setManual("");
    setError("");
    onClose();
  }

  return (
    <Dialog.Root open={!!user} onOpenChange={(o) => !o && !busy && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog">
          <Dialog.Title className="u2-dialog__title">Copy welcome message</Dialog.Title>
          <Dialog.Description asChild>
            <div className="u2-dialog__body">
              {manual ? (
                <>
                  <p>The browser did not allow copying. Select the text below and copy it by hand.</p>
                  <textarea readOnly rows={12} value={manual} aria-label="Welcome message" style={{ width: "100%" }} onFocus={(e) => e.currentTarget.select()} />
                </>
              ) : (
                <>
                  <p>
                    Put the password in the message for <strong>{user?.Name}</strong>?
                  </p>
                  <p>
                    <strong>Yes</strong> makes a new password now, and the old one stops working at once. <strong>No</strong> copies the message without a password; it tells them to use the one they already have.
                  </p>
                </>
              )}
            </div>
          </Dialog.Description>
          {error && (
            <p role="alert" className="u2-dialog__error">
              {error}
            </p>
          )}
          <div className="u2-dialog__actions">
            {manual ? (
              <Button variant="primary" onClick={close}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" disabled={!!busy} onClick={close}>
                  Cancel
                </Button>
                <Button variant="secondary" loading={busy === "without"} disabled={!!busy} onClick={() => void run(false)}>
                  No password
                </Button>
                <Button variant="danger" loading={busy === "with"} disabled={!!busy} onClick={() => void run(true)}>
                  Yes, reset and include
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import "./ConfirmDialog.css";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** The person must type this exact text before the confirm button works (for deletes). */
  requireText?: string;
  /** Runs on confirm. Throw to keep the dialog open; the message is shown inside it. */
  onConfirm: () => Promise<void> | void;
}

/** Modal confirm. Focus is trapped, Escape and Cancel close it, and the confirm button shows progress. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, danger, requireText, onConfirm }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const blocked = !!requireText && typed.trim() !== requireText;

  async function run() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onOpenChange(false);
      setTyped("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) {
          setTyped("");
          setError("");
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog">
          <Dialog.Title className="u2-dialog__title">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="u2-dialog__body">{description}</div>
          </Dialog.Description>
          {requireText && (
            <label className="u2-dialog__field">
              <span>
                Type <strong>{requireText}</strong> to confirm
              </span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
          {error && (
            <p role="alert" className="u2-dialog__error">
              {error}
            </p>
          )}
          <div className="u2-dialog__actions">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={blocked} disabledReason={blocked ? "Type the text above first." : undefined} onClick={run}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

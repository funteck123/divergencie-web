"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { Button } from "@/ui2/components/Button";
import { TextInput } from "@/ui2/components/Field";
import "./billing.css";

/**
 * Confirm what was actually received after the person says they paid. Full sets INR Due to 0; Partial asks for the amount
 * that is still due. Same three steps as the classic control (Mark paid, then Full or Partial, then Confirm).
 */
export function ApprovePayment({ onApprove, label = "Mark paid" }: { onApprove: (inrDue: number) => Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [partial, setPartial] = useState(false);
  const [due, setDue] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve(value: number) {
    setBusy(true);
    setError("");
    try {
      await onApprove(value);
      setOpen(false);
      setPartial(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPartial(false); setError(""); } }}>
      <Popover.Trigger asChild>
        <Button size="sm" variant="primary">
          {label}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="u2-portal u2-approve" align="end" sideOffset={4}>
          {partial ? (
            <>
              <label className="u2-approve__label">
                INR still due
                <TextInput type="number" step="0.01" value={due} onChange={(e) => setDue(e.target.value)} autoFocus />
              </label>
              <div className="u2-approve__row">
                <Button size="sm" variant="primary" loading={busy} onClick={() => void approve(Number(due))}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPartial(false)}>
                  Back
                </Button>
              </div>
            </>
          ) : (
            <div className="u2-approve__row">
              <Button size="sm" variant="primary" loading={busy} onClick={() => void approve(0)}>
                Full
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPartial(true)}>
                Partial…
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="u2-form__error">
              {error}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

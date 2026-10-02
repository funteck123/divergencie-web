"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { apiFetch } from "@/ui2/queries/client";
import { Button } from "./Button";
import { Field, TextArea, TextInput } from "./Field";
import "./ConfirmDialog.css";

/** Raise a ticket from any screen (POST /api/tickets). The dialog is controlled so a menu item can open it. */
export function ReportIssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit() {
    if (!message.trim()) return;
    setState("sending");
    setError("");
    try {
      await apiFetch("/api/tickets", { method: "POST", body: { message, attachmentUrl } });
      setState("sent");
      setMessage("");
      setAttachmentUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
      setState("idle");
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setState("idle"); setError(""); }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog" aria-describedby={undefined}>
          <Dialog.Title className="u2-dialog__title">Report an Issue</Dialog.Title>
          {state === "sent" ? (
            <>
              <p className="u2-dialog__body" role="status">Sent. Thanks, we&apos;ll take a look.</p>
              <div className="u2-dialog__actions">
                <Dialog.Close asChild>
                  <Button variant="primary">Close</Button>
                </Dialog.Close>
              </div>
            </>
          ) : (
            <>
              <Field label="What went wrong?">
                <TextArea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
              <Field label="Attachment URL (optional)" hint="A screenshot or document link.">
                <TextInput value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
              </Field>
              {error && <p role="alert" className="u2-dialog__error">{error}</p>}
              <div className="u2-dialog__actions">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.Close>
                <Button variant="primary" loading={state === "sending"} disabled={!message.trim()} disabledReason="Describe the problem first." onClick={() => void submit()}>
                  Send
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

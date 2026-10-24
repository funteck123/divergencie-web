"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ClipboardEvent } from "react";
import { shrinkToDataUrl } from "@/ui2/lib/shrinkImage";
import { collectTicketMeta } from "@/ui2/lib/ticketMeta";
import { apiFetch } from "@/ui2/queries/client";
import { keys } from "@/ui2/queries/keys";
import { Button } from "./Button";
import { Field, TextArea, TextInput } from "./Field";
import "./ConfirmDialog.css";
import "./ReportIssue.css";

/**
 * Raise a ticket from any screen (POST /api/tickets). The dialog is controlled so a menu item can open it.
 * `shot` is a screenshot already taken of the screen the person was on (the screenshot button) and `meta` the details recorded at that moment; without them
 * the dialog records the current page when the ticket is sent. A picture can also be added or pasted. The parent gives the dialog a new `key` each time
 * it opens, so every opening starts clean.
 */
export function ReportIssueDialog({ open, onOpenChange, shot = null, meta }: { open: boolean; onOpenChange: (open: boolean) => void; shot?: string | null; meta?: Record<string, unknown> }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [image, setImage] = useState<string | null>(shot);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [pictureLost, setPictureLost] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function addPicture(file: Blob | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not a picture.");
      return;
    }
    try {
      setImage(await shrinkToDataUrl(file));
      setError("");
    } catch {
      setError("That picture could not be read.");
    }
  }

  function onPaste(e: ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    void addPicture(item.getAsFile());
  }

  async function submit() {
    if (!message.trim()) return;
    setState("sending");
    setError("");
    try {
      const res = await apiFetch<{ imageSaved?: boolean }>("/api/tickets", { method: "POST", body: { message, attachmentUrl, image: image ?? undefined, meta: meta ?? collectTicketMeta() } });
      setPictureLost(res.imageSaved === false);
      setState("sent");
      void qc.invalidateQueries({ queryKey: keys.myTickets });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
      setState("idle");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog" aria-describedby={undefined}>
          <Dialog.Title className="u2-dialog__title">Report an Issue</Dialog.Title>
          {state === "sent" ? (
            <>
              <p className="u2-dialog__body" role="status">
                {pictureLost ? "Sent, but the picture could not be saved. Please say so in a reply." : "Sent. Thanks, we'll take a look."} You can follow the answer under My tickets.
              </p>
              <div className="u2-dialog__actions">
                <Dialog.Close asChild>
                  <Button variant="primary">Close</Button>
                </Dialog.Close>
              </div>
            </>
          ) : (
            <>
              <Field label="What went wrong?">
                <TextArea rows={4} autoFocus value={message} onChange={(e) => setMessage(e.target.value)} onPaste={onPaste} />
              </Field>
              <div className="u2-report__pic">
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from this browser, nothing for the image optimiser to do */}
                    <img className="u2-report__preview" src={image} alt={image === shot ? "Screenshot of the screen you were on" : "Picture to send with the ticket"} />
                    <Button size="sm" variant="ghost" onClick={() => setImage(null)}>
                      Remove picture
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
                    Add a picture
                  </Button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void addPicture(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <Field label="Attachment URL (optional)" hint="A document link, if a picture is not enough.">
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

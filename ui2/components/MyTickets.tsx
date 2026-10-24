"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/formatDate";
import { useMyTickets, useReplyTicket } from "@/ui2/queries/tickets";
import type { MyTicket } from "@/ui2/queries/types";
import { Badge } from "./Badge";
import { Button, LinkButton } from "./Button";
import { Field, TextArea } from "./Field";
import { Sheet } from "./Sheet";
import { TicketPicture } from "./TicketPicture";
import "./MyTickets.css";

const status = (t: MyTicket) => (t.ClosedAt ? "Closed" : t.OnHold ? "In progress" : "Open");
const statusKind = (t: MyTicket) => (t.ClosedAt ? "success" : t.OnHold ? "neutral" : "warning");

/**
 * The signed-in person's own tickets, newest first, with the replies on each (theirs and support's) and a way to reply.
 * It shows what the server sends for the sender: internal notes and device details are never in this list.
 */
export function MyTicketsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const tickets = useMyTickets(open);
  const [openId, setOpenId] = useState<string | null>(null);
  const current = (tickets.data ?? []).find((t) => t.TicketID === openId) ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setOpenId(null);
      }}
      title={current ? current.TicketID : "My tickets"}
      subtitle={current ? undefined : "Everything you have reported, and the answers."}
    >
      {tickets.isPending ? (
        <p className="u2-muted" role="status">Loading your tickets…</p>
      ) : tickets.isError ? (
        <p role="alert" className="u2-dialog__error">Your tickets could not be loaded. Close this and try again.</p>
      ) : current ? (
        <TicketThread ticket={current} onBack={() => setOpenId(null)} />
      ) : tickets.data.length === 0 ? (
        <p className="u2-muted">You have not reported anything yet.</p>
      ) : (
        <ul className="u2-mytickets__list">
          {tickets.data.map((t) => (
            <li key={t.TicketID}>
              <button type="button" className="u2-mytickets__row" onClick={() => setOpenId(t.TicketID)}>
                <span className="u2-mytickets__top">
                  <span className="u2-mono">{t.TicketID}</span>
                  <Badge kind={statusKind(t)}>{status(t)}</Badge>
                  <span className="u2-muted">{formatDateTime(t.CreatedAt) as string}</span>
                </span>
                <span className="u2-mytickets__line">{t.Message.split("\n")[0]}</span>
                {t.Replies.length > 0 && <span className="u2-muted">{t.Replies.length} {t.Replies.length === 1 ? "reply" : "replies"}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function TicketThread({ ticket: t, onBack }: { ticket: MyTicket; onBack: () => void }) {
  const reply = useReplyTicket();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function send() {
    if (!text.trim()) return;
    setError("");
    try {
      await reply.mutateAsync({ ticketId: t.TicketID, reply: text });
      setText("");
      toast.success("Reply sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the reply.");
    }
  }

  return (
    <div className="u2-form">
      <div className="u2-rowactions">
        <Button size="sm" variant="ghost" onClick={onBack}>
          All my tickets
        </Button>
        <Badge kind={statusKind(t)}>{status(t)}</Badge>
        <span className="u2-muted">{formatDateTime(t.CreatedAt) as string}</span>
      </div>
      <div className="u2-mytickets__msg u2-mytickets__msg--you">
        <span className="u2-muted">You</span>
        <p className="u2-prewrap">{t.Message}</p>
        {t.AttachmentURL && <LinkButton href={t.AttachmentURL} target="_blank">Attachment</LinkButton>}
        {t.HasImage && <TicketPicture ticketId={t.TicketID} label="Show my picture" />}
      </div>
      {t.Replies.map((r, i) => (
        <div key={i} className={r.From === "Support" ? "u2-mytickets__msg u2-mytickets__msg--support" : "u2-mytickets__msg u2-mytickets__msg--you"}>
          <span className="u2-muted">{r.From} · {formatDateTime(r.At) as string}</span>
          <p className="u2-prewrap">{r.Text}</p>
        </div>
      ))}
      {t.ClosedAt && (
        <div className="u2-mytickets__msg u2-mytickets__msg--support">
          <span className="u2-muted">Support · closed {formatDateTime(t.ClosedAt) as string}</span>
          <p className="u2-prewrap">{t.CloseMessage || "This ticket has been closed."}</p>
        </div>
      )}
      {t.ClosedAt ? (
        <p className="u2-muted">This ticket is closed. If it is not solved, please report it again.</p>
      ) : (
        <>
          <Field label="Add a reply">
            <TextArea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          {error && <p role="alert" className="u2-dialog__error">{error}</p>}
          <div className="u2-rowactions">
            <Button variant="primary" loading={reply.isPending} disabled={!text.trim()} disabledReason="Write your reply first." onClick={() => void send()}>
              Send reply
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

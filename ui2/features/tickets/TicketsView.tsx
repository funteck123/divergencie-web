"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button, LinkButton } from "@/ui2/components/Button";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { CheckField, Field, TextArea } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { usePatchTicket, useTickets, useUptimeCheck } from "@/ui2/queries/tickets";
import type { TicketRecord } from "@/ui2/queries/types";
import { useUsers } from "@/ui2/queries/users";
import "@/ui2/features/accounts/accounts.css";
import "@/ui2/features/billing/billing.css";
import "@/ui2/features/services/services.css";
import { onHoldCount, openCount, senderLabel, visibleTickets } from "./ticketLogic";

export function TicketsView() {
  const tickets = useTickets();
  const users = useUsers();
  const patch = usePatchTicket();
  const [showClosed, setShowClosed] = useState(false);
  const [showOnHold, setShowOnHold] = useState(false);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const all = useMemo(() => tickets.data ?? [], [tickets.data]);
  const label = (id: string) => senderLabel(users.data ?? [], id);
  const rows = useMemo(() => visibleTickets(all, { showClosed, showOnHold, search }, label), [all, showClosed, showOnHold, search, users.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = openCount(all);
  const hold = onHoldCount(all);

  const columns: Column<TicketRecord>[] = [
    {
      id: "id", header: "Ticket #", width: 110, sortValue: (t) => t.TicketID,
      cell: (t) => (
        <>
          <span className="u2-mono">{t.TicketID}</span>
          {t.OnHold && !t.ClosedAt && <span className="u2-sub">On hold</span>}
        </>
      ),
    },
    { id: "sender", header: "Sender", width: 190, sortValue: (t) => label(t.SenderUserID), tip: (t) => label(t.SenderUserID), cell: (t) => label(t.SenderUserID) },
    { id: "message", header: "Message", tip: (t) => t.Message, cell: (t) => <Button size="sm" variant="ghost" onClick={() => setOpenId(t.TicketID)}>{t.Message.split("\n")[0]}</Button> },
    { id: "notes", header: "Notes", width: 56, align: "center", sortValue: (t) => t.Notes?.length ?? 0, cell: (t) => t.Notes?.length || "—" },
    { id: "attachment", header: "Attachment", width: 90, cell: (t) => (t.AttachmentURL ? <LinkButton href={t.AttachmentURL} target="_blank">Link</LinkButton> : "—") },
    { id: "created", header: "Created", width: 130, sortValue: (t) => t.CreatedAt, cell: (t) => formatDateTime(t.CreatedAt) as string },
    { id: "closed", header: "Closed", width: 130, sortValue: (t) => t.ClosedAt ?? "", cell: (t) => (t.ClosedAt ? (formatDateTime(t.ClosedAt) as string) : "—") },
    {
      id: "actions", header: "", title: "Actions", width: 150,
      cell: (t) => (
        <span className="u2-rowactions">
          {!t.ClosedAt ? (
            <CloseQuick ticket={t} onClose={async (message) => { await patch.mutateAsync({ ticketId: t.TicketID, action: "close", extra: { closeMessage: message } }); toast.success(`Closed ${t.TicketID}.`); }} />
          ) : (
            <Button size="sm" variant="ghost" onClick={async () => { try { await patch.mutateAsync({ ticketId: t.TicketID, action: "reopen" }); toast.success(`Reopened ${t.TicketID}.`); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not reopen."); } }}>
              Reopen
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpenId(t.TicketID)}>
            Open
          </Button>
        </span>
      ),
    },
  ];

  return (
    <section className="u2-accounts">
      <h1>Tickets</h1>
      <UptimePanel />
      <div className="u2-toolbar">
        <h2>
          {open > 0 && <Badge kind="warning">{open} open</Badge>} {hold > 0 && <Badge kind="neutral">{hold} on hold</Badge>}
        </h2>
        <input type="search" className="u2-search" placeholder="Search sender or message…" aria-label="Search tickets" value={search} onChange={(e) => setSearch(e.target.value)} />
        <CheckField label="Show on hold" checked={showOnHold} onChange={setShowOnHold} />
        <CheckField label="Show closed" checked={showClosed} onChange={setShowClosed} />
      </div>
      {tickets.error ? (
        <div role="alert" className="u2-errorbox">
          Could not load tickets: {tickets.error.message}{" "}
          <Button size="sm" variant="ghost" onClick={() => void tickets.refetch()}>Try again</Button>
        </div>
      ) : (
        <DataTable caption="Tickets" rows={rows} columns={columns} rowKey={(t) => t.TicketID} loading={tickets.isPending} initialSort={{ id: "created", dir: "desc" }} emptyText={`No ${showClosed ? "" : "open "}tickets.`} />
      )}
      <ThreadSheet ticketId={openId} label={label} onClose={() => setOpenId(null)} />
    </section>
  );
}

/** Close with one click and an optional resolution note, from the row. */
function CloseQuick({ ticket, onClose }: { ticket: TicketRecord; onClose: (message: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" variant="primary" aria-label={`Close ${ticket.TicketID}`}>Close</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="u2-portal u2-approve" align="end" sideOffset={4}>
          <label className="u2-approve__label">
            Resolution note (optional)
            <TextArea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="u2-approve__row">
            <Button size="sm" variant="primary" loading={busy} onClick={async () => { setBusy(true); setError(""); try { await onClose(text); setOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Could not close."); } finally { setBusy(false); } }}>
              Confirm Close
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {error && <p role="alert" className="u2-form__error">{error}</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ThreadSheet({ ticketId, label, onClose }: { ticketId: string | null; label: (id: string) => string; onClose: () => void }) {
  const { data } = useTickets();
  const t = ticketId ? data?.find((x) => x.TicketID === ticketId) ?? null : null;
  return (
    <Sheet open={!!ticketId} onOpenChange={(o) => !o && onClose()} title={t ? `Ticket ${t.TicketID}` : "Ticket"} subtitle={t ? label(t.SenderUserID) : undefined} wide>
      {t && <Thread key={t.TicketID} t={t} label={label} />}
    </Sheet>
  );
}

function Thread({ t, label }: { t: TicketRecord; label: (id: string) => string }) {
  const patch = usePatchTicket();
  const [mode, setMode] = useState<"" | "edit" | "close" | "hold">("");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function run(action: Parameters<typeof patch.mutateAsync>[0]["action"], extra: Record<string, unknown> | undefined, done: string) {
    setError("");
    try {
      await patch.mutateAsync({ ticketId: t.TicketID, action, extra });
      toast.success(done);
      setMode("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    }
  }

  return (
    <div className="u2-form">
      <div className="u2-rowactions">
        {t.ClosedAt ? <Badge kind="success">Closed {formatDateTime(t.ClosedAt) as string}</Badge> : t.OnHold ? <Badge kind="neutral">On hold</Badge> : <Badge kind="warning">Open</Badge>}
        <span className="u2-muted">Created {formatDateTime(t.CreatedAt) as string}</span>
        {t.AttachmentURL && <LinkButton href={t.AttachmentURL} target="_blank">Attachment</LinkButton>}
      </div>
      {t.OnHold && !t.ClosedAt && t.OnHoldReason && <p className="u2-warnbox u2-prewrap">On hold: {t.OnHoldReason}</p>}
      {t.CloseMessage && <p className="u2-bill-hint u2-prewrap">Resolution: {t.CloseMessage}</p>}

      {mode === "edit" ? (
        <Field label="Message">
          <TextArea rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      ) : (
        <p className="u2-prewrap">{t.Message}</p>
      )}

      {Array.isArray(t.Notes) && t.Notes.length > 0 && (
        <div className="u2-rows">
          {t.Notes.map((n, i) => (
            <div key={i} className="u2-box u2-box--inner u2-prewrap">
              <span className="u2-muted">{label(n.By)} · {formatDateTime(n.At) as string}</span>
              <span>{n.Text}</span>
            </div>
          ))}
        </div>
      )}

      {mode === "close" && (
        <Field label={t.ClosedAt ? "Resolution note" : "Resolution note (optional)"}>
          <TextArea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      )}
      {mode === "hold" && (
        <Field label="Why is this on hold? (optional)">
          <TextArea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      )}
      {error && <p role="alert" className="u2-form__error">{error}</p>}

      <div className="u2-form__actions">
        {mode === "edit" && (
          <>
            <Button variant="primary" loading={patch.isPending} onClick={() => (draft.trim() ? void run("edit", { message: draft }, "Message saved.") : setError("Message can't be empty."))}>Save</Button>
            <Button variant="ghost" onClick={() => setMode("")}>Cancel</Button>
          </>
        )}
        {mode === "close" && (
          <>
            <Button variant="primary" loading={patch.isPending} onClick={() => void run("close", { closeMessage: draft }, t.ClosedAt ? "Note saved." : "Ticket closed.")}>{t.ClosedAt ? "Save note" : "Confirm Close"}</Button>
            <Button variant="ghost" onClick={() => setMode("")}>Cancel</Button>
          </>
        )}
        {mode === "hold" && (
          <>
            <Button variant="primary" loading={patch.isPending} onClick={() => void run("hold", { holdReason: draft }, "Put on hold.")}>Confirm Hold</Button>
            <Button variant="ghost" onClick={() => setMode("")}>Cancel</Button>
          </>
        )}
        {mode === "" && (
          <>
            <Button variant="ghost" onClick={() => { setDraft(t.Message); setError(""); setMode("edit"); }}>Edit</Button>
            {!t.ClosedAt ? (
              <>
                <Button variant="primary" onClick={() => { setDraft(t.CloseMessage || ""); setMode("close"); }}>Close</Button>
                {t.OnHold ? (
                  <Button variant="ghost" loading={patch.isPending} onClick={() => void run("unhold", undefined, "Resumed.")}>Resume</Button>
                ) : (
                  <Button variant="ghost" onClick={() => { setDraft(t.OnHoldReason || ""); setMode("hold"); }}>Hold</Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => { setDraft(t.CloseMessage || ""); setMode("close"); }}>{t.CloseMessage ? "Edit note" : "Add note"}</Button>
                <Button variant="ghost" loading={patch.isPending} onClick={() => void run("reopen", undefined, "Reopened.")}>Reopen</Button>
              </>
            )}
          </>
        )}
      </div>

      <Field label="Add a note" hint="Internal. Never shown to the sender.">
        <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="u2-form__actions">
        <Button variant="primary" disabled={!note.trim()} disabledReason="Write the note first." loading={patch.isPending && mode === ""} onClick={async () => { if (await run("note", { noteText: note }, "Note added.")) setNote(""); }}>
          Add note
        </Button>
      </div>
    </div>
  );
}

function UptimePanel() {
  const check = useUptimeCheck();
  const data = check.data;
  return (
    <section className="u2-box">
      <div className="u2-toolbar">
        <div>
          <h2>Prototype Service Status</h2>
          <p className="u2-muted">DC Question Solver &amp; Syllabus Viewer. Live check, not the daily automated alert.</p>
        </div>
        <Button variant="ghost" className="u2-toolbar__new" loading={check.isPending} onClick={() => check.mutate()}>
          Check Uptime
        </Button>
      </div>
      {check.error && <p role="alert" className="u2-form__error">{check.error.message}</p>}
      {data && (
        <div className="u2-rows">
          {data.results.map((r) => (
            <div key={r.name} className="u2-rowactions">
              <Badge kind={r.up ? "success" : "error"}>{r.up ? "UP" : "DOWN"}</Badge>
              <span>{r.name}</span>
              {!r.up && r.reason && <span className="u2-muted">— {r.reason}</span>}
            </div>
          ))}
          <span className="u2-muted">Checked at {new Date(data.checkedAt).toLocaleString()}.</span>
        </div>
      )}
    </section>
  );
}

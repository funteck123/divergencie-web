import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Generic issue-reporting ticket — any authenticated account (any UserType,
// including Trial/Interview) can raise one; only Management can close it.
// Sender info is never freeform — it's always the session's own userId, not
// something the client can spoof.

// Management-only: full list, for the admin Tickets tab.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ tickets: db.tickets || [] });
}

// body: { message, attachmentUrl? }
export async function POST(req) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const { message, attachmentUrl } = await req.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const db = await readDB();
  const ticket = {
    TicketID: await nextId(db, "TKT"),
    SenderUserID: session.userId,
    SenderUserType: session.userType,
    Message: message.trim(),
    AttachmentURL: (attachmentUrl || "").trim(),
    CreatedAt: new Date().toISOString(),
    ClosedAt: "",
    ClosedBy: "",
    CloseMessage: "",
    // TKT-0216: "On Hold" -- a ticket that's still open but not currently
    // actionable (waiting on a bigger dependency, or deferred by choice).
    // Separate from Closed/Reopened on purpose: closing implies done,
    // On Hold means "not done, just not being worked right now."
    OnHold: false,
    OnHoldReason: "",
  };
  db.tickets = db.tickets || [];
  db.tickets.push(ticket);
  await writeDB(db, ["tickets"]);

  return NextResponse.json({ ticket });
}

// body: { ticketId, action?: "close" | "reopen" | "edit" | "hold" | "unhold", message?, attachmentUrl?, closeMessage?, holdReason? }
// "note" appends { At, By, Text } to ticket.Notes (body: noteText).
// action defaults to "close" (unchanged behavior for existing callers).
// close/reopen are idempotent: closing an already-closed ticket or
// reopening an already-open one just returns it unchanged rather than
// erroring, since double-clicking a button shouldn't be a failure case —
// EXCEPT closeMessage, which can still be set/updated on an already-closed
// ticket by sending another "close" with it (e.g. adding a resolution note
// after closing without one) without needing ClosedAt/ClosedBy to change.
// "edit" is its own explicit action (not inferred from the mere presence
// of `message`) so a caller can never accidentally close/reopen a ticket
// as an unwanted side effect of an edit request, or vice versa — allowed
// on a closed ticket too (fixing a typo shouldn't require reopening it
// first). "hold"/"unhold" (TKT-0216) are independent of open/closed --
// On Hold just means "not currently actionable," not "done."
export async function PATCH(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { ticketId, action, message, attachmentUrl, closeMessage, holdReason, noteText } = await req.json();
  if (!ticketId) return NextResponse.json({ error: "ticketId is required." }, { status: 400 });
  if (action !== undefined && !["close", "reopen", "edit", "hold", "unhold", "note"].includes(action)) {
    return NextResponse.json({ error: "action must be close, reopen, edit, hold, unhold, or note." }, { status: 400 });
  }

  const db = await readDB();
  const ticket = (db.tickets || []).find((t) => t.TicketID === ticketId);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  if (action === "edit") {
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "message is required to edit a ticket." }, { status: 400 });
    }
    const before = { Message: ticket.Message, AttachmentURL: ticket.AttachmentURL };
    ticket.Message = message.trim();
    if (attachmentUrl !== undefined) ticket.AttachmentURL = attachmentUrl.trim();
    await writeDB(db, ["tickets"]);
    await logAudit({
      actorUserId: session.userId,
      action: "edit",
      entityType: "Ticket",
      entityId: ticket.TicketID,
      summary: `Edited ticket ${ticket.TicketID}`,
      snapshot: { before, after: { Message: ticket.Message, AttachmentURL: ticket.AttachmentURL } },
    });
  } else if ((action || "close") === "close") {
    const wasAlreadyClosed = !!ticket.ClosedAt;
    if (!wasAlreadyClosed) {
      ticket.ClosedAt = new Date().toISOString();
      ticket.ClosedBy = session.userId;
    }
    if (closeMessage !== undefined) ticket.CloseMessage = closeMessage.trim();
    if (!wasAlreadyClosed || closeMessage !== undefined) {
      await writeDB(db, ["tickets"]);
      await logAudit({ actorUserId: session.userId, action: "close", entityType: "Ticket", entityId: ticket.TicketID, summary: `Closed ticket ${ticket.TicketID}` });
    }
  } else if (action === "reopen" && ticket.ClosedAt) {
    ticket.ClosedAt = "";
    ticket.ClosedBy = "";
    ticket.CloseMessage = "";
    await writeDB(db, ["tickets"]);
    await logAudit({ actorUserId: session.userId, action: "reopen", entityType: "Ticket", entityId: ticket.TicketID, summary: `Reopened ticket ${ticket.TicketID}` });
  } else if (action === "hold") {
    ticket.OnHold = true;
    ticket.OnHoldReason = (holdReason || "").trim();
    await writeDB(db, ["tickets"]);
    await logAudit({ actorUserId: session.userId, action: "hold", entityType: "Ticket", entityId: ticket.TicketID, summary: `Put ticket ${ticket.TicketID} on hold${ticket.OnHoldReason ? `: ${ticket.OnHoldReason}` : ""}` });
  } else if (action === "note") {
    // Append-only internal note (Management-only field, never returned to
    // the sender). Separate from "edit" so adding context never rewrites
    // what the reporter actually wrote.
    const text = (noteText || "").trim();
    if (!text) return NextResponse.json({ error: "noteText is required to add a note." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "noteText must be 4000 characters or fewer." }, { status: 400 });
    ticket.Notes = Array.isArray(ticket.Notes) ? ticket.Notes : [];
    ticket.Notes.push({ At: new Date().toISOString(), By: session.userId, Text: text });
    await writeDB(db, ["tickets"]);
    await logAudit({ actorUserId: session.userId, action: "note", entityType: "Ticket", entityId: ticket.TicketID, summary: `Added a note to ticket ${ticket.TicketID}` });
  } else if (action === "unhold") {
    ticket.OnHold = false;
    ticket.OnHoldReason = "";
    await writeDB(db, ["tickets"]);
    await logAudit({ actorUserId: session.userId, action: "unhold", entityType: "Ticket", entityId: ticket.TicketID, summary: `Took ticket ${ticket.TicketID} off hold` });
  }

  return NextResponse.json({ ticket });
}

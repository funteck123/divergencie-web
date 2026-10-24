import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";
import { parseImage, compressImage, saveTicketImage, ticketImageUrl } from "@/lib/ticketImage";
import { sanitizeMeta, serverMeta } from "@/lib/ticketMeta";
import { canOpen, senderView, ticketsFor, MAX_REPLY, MAX_REPLIES } from "@/lib/ticketView";

// Generic issue-reporting ticket — any authenticated account (any UserType,
// including Trial/Interview) can raise one; only Management can close it.
// Sender info is never freeform — it's always the session's own userId, not
// something the client can spoof.
// Everyone can read their own tickets and the replies on them. Management reads all
// of them, plus the internal notes and device details that are never sent to the
// person who raised the ticket (lib/ticketView.js is the one place that decides this).

// GET /api/tickets                 -> Management: every ticket as stored. Anyone else: their own tickets, newest first, in sender view.
// GET /api/tickets?mine=1          -> only the tickets this person raised, in sender view, whatever their role (the "My tickets" screen).
// GET /api/tickets?image=TKT-0001  -> { url }, a link to that ticket's picture that works for 5 minutes. Management, or the sender of that ticket.
export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  const tickets = db.tickets || [];

  const params = new URL(req.url).searchParams;
  const imageId = params.get("image");
  if (imageId) {
    const ticket = tickets.find((t) => t.TicketID === imageId);
    if (!ticket || !canOpen(session, ticket) || !ticket.HasImage) {
      return NextResponse.json({ error: "No picture for that ticket." }, { status: 404 });
    }
    const url = await ticketImageUrl(ticket.TicketID);
    if (!url) return NextResponse.json({ error: "The picture could not be opened." }, { status: 502 });
    return NextResponse.json({ url });
  }

  return NextResponse.json({ tickets: ticketsFor(session, tickets, { mine: params.get("mine") === "1" }) });
}

// body (new ticket): { message, attachmentUrl?, image?, meta? }
//   image: a data URL (JPEG, PNG or WebP), shrunk and saved as a small JPEG. A picture that cannot be read refuses the whole request, a picture that cannot be
//   stored does not lose the ticket (the answer says imageSaved: false). meta: what the browser knows about the screen the ticket was raised on (lib/ticketMeta.js).
// body (reply):      { ticketId, reply }  -- the sender or Management adds a reply that both can read. The sender cannot reply to a closed ticket.
export async function POST(req) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const body = await req.json();

  if (body.ticketId !== undefined) {
    const text = String(body.reply || "").trim();
    if (!text) return NextResponse.json({ error: "reply is required." }, { status: 400 });
    if (text.length > MAX_REPLY) return NextResponse.json({ error: `reply must be ${MAX_REPLY} characters or fewer.` }, { status: 400 });
    const db = await readDB();
    const ticket = (db.tickets || []).find((t) => t.TicketID === body.ticketId);
    if (!ticket || !canOpen(session, ticket)) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const isManagement = session.userType === "Management";
    if (ticket.ClosedAt && !isManagement) {
      return NextResponse.json({ error: "This ticket is closed. Please raise a new one." }, { status: 409 });
    }
    ticket.Replies = Array.isArray(ticket.Replies) ? ticket.Replies : [];
    if (ticket.Replies.length >= MAX_REPLIES) return NextResponse.json({ error: "This ticket has too many replies. Please raise a new one." }, { status: 409 });
    ticket.Replies.push({ At: new Date().toISOString(), By: session.userId, ByType: isManagement ? "Management" : "Sender", Text: text });
    await writeDB(db, ["tickets"]);
    if (isManagement) {
      await logAudit({ actorUserId: session.userId, action: "reply", entityType: "Ticket", entityId: ticket.TicketID, summary: `Replied to ticket ${ticket.TicketID}` });
    }
    return NextResponse.json({ ticket: isManagement ? ticket : senderView(ticket) });
  }

  const { message, attachmentUrl, image, meta } = body;
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  let jpeg = null;
  if (image) {
    const raw = parseImage(image);
    if (!raw) return NextResponse.json({ error: "Picture not accepted (JPG, PNG or WebP, up to 6 MB)." }, { status: 400 });
    try {
      jpeg = await compressImage(raw);
    } catch {
      return NextResponse.json({ error: "Picture could not be read." }, { status: 400 });
    }
  }

  const db = await readDB();
  const ticket = {
    TicketID: await nextId(db, "TKT"),
    SenderUserID: session.userId,
    SenderUserType: session.userType,
    Message: message.trim(),
    AttachmentURL: (attachmentUrl || "").trim(),
    HasImage: false,
    Meta: { client: sanitizeMeta(meta), server: serverMeta(req) },
    Replies: [],
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
  // The picture is stored before the record is written so the flag is true or false for a reason; a failure here never loses the ticket.
  const imageSaved = jpeg ? await saveTicketImage(ticket.TicketID, jpeg) : undefined;
  ticket.HasImage = imageSaved === true;
  db.tickets = db.tickets || [];
  db.tickets.push(ticket);
  await writeDB(db, ["tickets"]);

  return NextResponse.json({ ticket: session.userType === "Management" ? ticket : senderView(ticket), ...(jpeg ? { imageSaved } : {}) });
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

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
    TicketID: nextId(db, "TKT"),
    SenderUserID: session.userId,
    SenderUserType: session.userType,
    Message: message.trim(),
    AttachmentURL: (attachmentUrl || "").trim(),
    CreatedAt: new Date().toISOString(),
    ClosedAt: "",
    ClosedBy: "",
  };
  db.tickets = db.tickets || [];
  db.tickets.push(ticket);
  await writeDB(db);

  return NextResponse.json({ ticket });
}

// body: { ticketId, action?: "close" | "reopen" } — action defaults to
// "close" (unchanged behavior for existing callers). Both directions are
// Management-only and idempotent: closing an already-closed ticket or
// reopening an already-open one just returns it unchanged rather than
// erroring, since double-clicking a button shouldn't be a failure case.
export async function PATCH(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { ticketId, action } = await req.json();
  if (!ticketId) return NextResponse.json({ error: "ticketId is required." }, { status: 400 });
  if (action !== undefined && !["close", "reopen"].includes(action)) {
    return NextResponse.json({ error: "action must be close or reopen." }, { status: 400 });
  }

  const db = await readDB();
  const ticket = (db.tickets || []).find((t) => t.TicketID === ticketId);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  if ((action || "close") === "close" && !ticket.ClosedAt) {
    ticket.ClosedAt = new Date().toISOString();
    ticket.ClosedBy = session.userId;
    await writeDB(db);
    await logAudit({ actorUserId: session.userId, action: "close", entityType: "Ticket", entityId: ticket.TicketID, summary: `Closed ticket ${ticket.TicketID}` });
  } else if (action === "reopen" && ticket.ClosedAt) {
    ticket.ClosedAt = "";
    ticket.ClosedBy = "";
    await writeDB(db);
    await logAudit({ actorUserId: session.userId, action: "reopen", entityType: "Ticket", entityId: ticket.TicketID, summary: `Reopened ticket ${ticket.TicketID}` });
  }

  return NextResponse.json({ ticket });
}

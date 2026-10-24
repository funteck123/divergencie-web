// Who sees what on a ticket.
//   Management: the whole record, including internal Notes (never shown to the sender), the on-hold reason, the picture and the device details.
//   The sender: their own tickets only, with the message, the replies (theirs and support's), the resolution text and whether it is open, on hold or closed.
// Internal notes, on-hold reasons, device details and internal user IDs are removed here, in one place, so no route can forget to do it.
export const MAX_REPLY = 4000;
export const MAX_REPLIES = 200;

/** One reply as the sender sees it: "You" or "Support", no user IDs. */
const replyForSender = (r) => ({ At: r.At, From: r.ByType === "Management" ? "Support" : "You", Text: r.Text });

export function senderView(t) {
  return {
    TicketID: t.TicketID,
    Message: t.Message,
    AttachmentURL: t.AttachmentURL || "",
    HasImage: !!t.HasImage,
    CreatedAt: t.CreatedAt,
    ClosedAt: t.ClosedAt || "",
    CloseMessage: t.CloseMessage || "",
    OnHold: !!t.OnHold && !t.ClosedAt,
    Replies: (Array.isArray(t.Replies) ? t.Replies : []).map(replyForSender),
  };
}

/** The tickets a signed-in person may list: Management gets every ticket as stored; anyone else gets only their own, newest first, in sender view. */
export function ticketsFor(session, tickets) {
  if (session.userType === "Management") return tickets;
  return tickets
    .filter((t) => t.SenderUserID === session.userId)
    .sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)))
    .map(senderView);
}

/** May this session open this ticket (read it, reply to it, open its picture)? Management any ticket; anyone else only their own. */
export const canOpen = (session, ticket) => session.userType === "Management" || ticket.SenderUserID === session.userId;

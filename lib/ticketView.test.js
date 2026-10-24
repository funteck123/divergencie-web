import test from "node:test";
import assert from "node:assert/strict";
import { canOpen, senderView, ticketsFor } from "./ticketView.js";

const ticket = (over = {}) => ({
  TicketID: "TKT-0001", SenderUserID: "STU-0001", SenderUserType: "Student", Message: "It broke", AttachmentURL: "", HasImage: true,
  Meta: { client: { page: "/x" }, server: { userAgent: "UA" } }, Replies: [{ At: "2026-10-24T10:00:00Z", By: "MGT-0001", ByType: "Management", Text: "Looking" }, { At: "2026-10-24T11:00:00Z", By: "STU-0001", ByType: "Sender", Text: "Thanks" }],
  Notes: [{ At: "x", By: "MGT-0001", Text: "INTERNAL: the sender is wrong" }], OnHold: true, OnHoldReason: "INTERNAL waiting on vendor", CreatedAt: "2026-10-24T09:00:00Z", ClosedAt: "", ClosedBy: "", CloseMessage: "", ...over,
});
const mgt = { userId: "MGT-0001", userType: "Management" };
const stu = { userId: "STU-0001", userType: "Student" };

test("the sender never receives internal notes, the on-hold reason, device details or user IDs", () => {
  const json = JSON.stringify(senderView(ticket()));
  for (const secret of ["INTERNAL", "Notes", "OnHoldReason", "Meta", "userAgent", "MGT-0001", "SenderUserID", "ClosedBy"]) assert.ok(!json.includes(secret), secret);
});

test("replies show as You or Support", () => {
  assert.deepEqual(senderView(ticket()).Replies.map((r) => r.From), ["Support", "You"]);
});

test("an open ticket on hold shows as on hold, a closed one does not", () => {
  assert.equal(senderView(ticket()).OnHold, true);
  assert.equal(senderView(ticket({ ClosedAt: "2026-10-25T00:00:00Z" })).OnHold, false);
});

test("the resolution text is visible to the sender", () => {
  assert.equal(senderView(ticket({ ClosedAt: "x", CloseMessage: "Fixed in v2" })).CloseMessage, "Fixed in v2");
});

test("Management gets every ticket as stored, including notes", () => {
  const all = [ticket(), ticket({ TicketID: "TKT-0002", SenderUserID: "STU-0002" })];
  const out = ticketsFor(mgt, all);
  assert.equal(out.length, 2);
  assert.ok(out[0].Notes);
});

test("anyone else gets only their own tickets, newest first", () => {
  const all = [ticket({ TicketID: "TKT-0001" }), ticket({ TicketID: "TKT-0002", SenderUserID: "STU-0002" }), ticket({ TicketID: "TKT-0003", CreatedAt: "2026-10-25T09:00:00Z" })];
  assert.deepEqual(ticketsFor(stu, all).map((t) => t.TicketID), ["TKT-0003", "TKT-0001"]);
});

test("a ticket missing its replies still has a clean view", () => {
  assert.deepEqual(senderView(ticket({ Replies: undefined })).Replies, []);
});

test("only Management or the sender may open a ticket", () => {
  assert.equal(canOpen(mgt, ticket()), true);
  assert.equal(canOpen(stu, ticket()), true);
  assert.equal(canOpen({ userId: "STU-0002", userType: "Student" }, ticket()), false);
});

test("with mine, Management also gets only the tickets they raised, in sender view", () => {
  const all = [ticket({ TicketID: "TKT-0001", SenderUserID: "MGT-0001" }), ticket({ TicketID: "TKT-0002", SenderUserID: "STU-0002" })];
  const out = ticketsFor(mgt, all, { mine: true });
  assert.deepEqual(out.map((t) => t.TicketID), ["TKT-0001"]);
  assert.ok(!JSON.stringify(out).includes("INTERNAL"));
});

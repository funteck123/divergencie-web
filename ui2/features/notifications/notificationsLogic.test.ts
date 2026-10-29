import { describe, expect, it } from "vitest";
import { buildNotifications, countByKind, ticketNeedsReply, type NotificationInput } from "./notificationsLogic";
import type { TicketRecord } from "@/ui2/queries/types";

const tk = (o: Partial<TicketRecord>): TicketRecord => ({ TicketID: "TKT-1", SenderUserID: "U1", Message: "Help", CreatedAt: "2026-10-01T00:00:00Z", ...o });
const empty: NotificationInput = { leads: [], regForms: [], pendingTrials: [], pendingInterviews: [], rescheduleRequests: [], tickets: [] };

describe("ticket needs a reply", () => {
  it("open with no replies", () => expect(ticketNeedsReply(tk({}))).toBe(true));
  it("closed or on hold never", () => { expect(ticketNeedsReply(tk({ ClosedAt: "2026-10-02T00:00:00Z" }))).toBe(false); expect(ticketNeedsReply(tk({ OnHold: true }))).toBe(false); });
  it("last word is Management's: waits for the sender, not for us", () => expect(ticketNeedsReply(tk({ Replies: [{ At: "x", By: "M", ByType: "Management", Text: "ok" }] }))).toBe(false));
  it("sender replied last: needs us again", () => expect(ticketNeedsReply(tk({ Replies: [{ At: "x", By: "M", ByType: "Management", Text: "ok" }, { At: "y", By: "U1", ByType: "Sender", Text: "still broken" }] }))).toBe(true));
});

describe("buildNotifications", () => {
  const input: NotificationInput = {
    ...empty,
    leads: [{ LeadID: "L1", Name: "Ana", Email: "a@x.co", CreatedAt: "2026-10-05T00:00:00Z", Notes: "Wants   Physics" }, { LeadID: "L2", Name: "Old", Email: "o@x.co", CreatedAt: "2026-10-01T00:00:00Z", Status: "contacted" } as never],
    regForms: [{ RegFormID: "R1", Name: "Ben", RequestedType: "Trial", Status: "Pending", CreatedAt: "2026-10-07T00:00:00Z" }, { RegFormID: "R2", Name: "Cy", RequestedType: "Trial", Status: "Approved" }],
    pendingTrials: [{ TrialID: "TR1", ServiceID: "S1", RequesterName: "Di" }],
    rescheduleRequests: [{ RescheduleRequestID: "RR1", ScheduleItemID: "X", RequesterName: "Eve", RequestedDate: "2026-11-01", RequestedTime: "10:00" }],
    tickets: [tk({ TicketID: "TKT-9", CreatedAt: "2026-10-09T00:00:00Z" }), tk({ TicketID: "TKT-8", ClosedAt: "2026-10-10T00:00:00Z" })],
  };
  const items = buildNotifications(input);
  it("keeps only what waits for Management", () => expect(items.map((x) => x.id).sort()).toEqual(["lead:L1", "reg:R1", "resched:RR1", "ticket:TKT-9", "trial:TR1"]));
  it("newest first, items without a time last", () => expect(items.map((x) => x.id)).toEqual(["ticket:TKT-9", "reg:R1", "lead:L1", "resched:RR1", "trial:TR1"]));
  it("counts by kind", () => expect(countByKind(items)).toEqual({ inquiry: 1, application: 1, request: 1, reschedule: 1, ticket: 1 }));
  it("collapses whitespace in notes", () => expect(items.find((x) => x.id === "lead:L1")?.detail).toBe("Wants Physics"));
  it("empty input gives nothing", () => expect(buildNotifications(empty)).toEqual([]));
});

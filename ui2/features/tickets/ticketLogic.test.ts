import { describe, expect, it } from "vitest";
import { onHoldCount, openCount, visibleTickets } from "./ticketLogic";
import type { TicketRecord } from "@/ui2/queries/types";

const t = (o: Partial<TicketRecord>): TicketRecord => ({ TicketID: "T", SenderUserID: "U1", Message: "hello", CreatedAt: "2026-10-01T00:00:00Z", ...o });
const list = [t({ TicketID: "A", CreatedAt: "2026-10-01T00:00:00Z" }), t({ TicketID: "B", CreatedAt: "2026-10-03T00:00:00Z", OnHold: true }), t({ TicketID: "C", CreatedAt: "2026-10-02T00:00:00Z", ClosedAt: "2026-10-04T00:00:00Z" })];
const label = (id: string) => `Name of ${id}`;
const ids = (x: TicketRecord[]) => x.map((r) => r.TicketID);

describe("ticket list rules", () => {
  it("default shows only open tickets", () => expect(ids(visibleTickets(list, { showClosed: false, showOnHold: false, search: "" }, label))).toEqual(["A"]));
  it("on hold tickets appear when asked, newest first", () => expect(ids(visibleTickets(list, { showClosed: false, showOnHold: true, search: "" }, label))).toEqual(["B", "A"]));
  it("closed tickets appear when asked, even if flagged on hold", () => expect(ids(visibleTickets(list, { showClosed: true, showOnHold: false, search: "" }, label))).toEqual(["C", "A"]));
  it("search matches sender label and message", () => expect(ids(visibleTickets(list, { showClosed: true, showOnHold: true, search: "name of u1" }, label)).length).toBe(3));
  it("counts", () => { expect(openCount(list)).toBe(1); expect(onHoldCount(list)).toBe(1); });
});

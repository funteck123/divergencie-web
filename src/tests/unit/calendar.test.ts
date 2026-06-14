import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { GET as getCalendar, PATCH as patchCalendar } from "@/app/api/calendar/route";

const db = prisma as any;

describe("Calendar API Route Handlers", () => {
  describe("GET /api/calendar", () => {
    it("returns 401 when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/calendar");
      const res = await getCalendar(req);
      expect(res.status).toBe(401);
    });

    it("returns calendar items for authenticated user", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "test-user-id" },
      } as any);

      const mockItems = [
        { id: "c1", title: "Class 1", userId: "test-user-id", startTime: new Date().toISOString() },
        { id: "c2", title: "Class 2", userId: "test-user-id", startTime: new Date().toISOString() },
      ];
      db.calendarItem.findMany.mockResolvedValueOnce(mockItems);

      const req = new NextRequest("http://localhost/api/calendar?start=2026-06-01T00:00:00.000Z");
      const res = await getCalendar(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockItems);
      expect(db.calendarItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
            startTime: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe("PATCH /api/calendar", () => {
    it("returns 401 when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/calendar", {
        method: "PATCH",
        body: JSON.stringify({ id: "c1", addedToGCal: true }),
      });
      const res = await patchCalendar(req);
      expect(res.status).toBe(401);
    });

    it("toggles addedToGCal status when owned by user", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "test-user-id" },
      } as any);

      db.calendarItem.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "test-user-id",
        addedToGCal: false,
      });

      db.calendarItem.update.mockResolvedValueOnce({
        id: "c1",
        userId: "test-user-id",
        addedToGCal: true,
      });

      const req = new NextRequest("http://localhost/api/calendar", {
        method: "PATCH",
        body: JSON.stringify({ id: "c1", addedToGCal: true }),
      });
      const res = await patchCalendar(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.addedToGCal).toBe(true);
      expect(db.calendarItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: expect.objectContaining({
            addedToGCal: true,
          }),
        })
      );
    });

    it("returns 403 when updating other user's item", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "other-user-id" },
      } as any);

      db.calendarItem.findUnique.mockResolvedValueOnce({
        id: "c1",
        userId: "test-user-id",
        addedToGCal: false,
      });

      const req = new NextRequest("http://localhost/api/calendar", {
        method: "PATCH",
        body: JSON.stringify({ id: "c1", addedToGCal: true }),
      });
      const res = await patchCalendar(req);
      expect(res.status).toBe(403);
    });
  });
});

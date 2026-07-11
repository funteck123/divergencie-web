import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { POST as markAllRead } from "@/app/api/notifications/mark-all-read/route";
import { PATCH as markSingleRead } from "@/app/api/notifications/[id]/read/route";

const db = prisma as any;

describe("Notifications API Route Handlers", () => {
  describe("GET /api/notifications", () => {
    it("returns 401 when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/notifications?unread=true");
      const res = await getNotifications(req);
      expect(res.status).toBe(401);
    });

    it("returns notifications for authenticated user", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "test-user-id" },
      } as any);

      const mockNotifications = [
        { id: "n1", title: "Notif 1", read: false },
        { id: "n2", title: "Notif 2", read: false },
      ];
      db.notification.findMany.mockResolvedValueOnce(mockNotifications);

      const req = new NextRequest("http://localhost/api/notifications?unread=true");
      const res = await getNotifications(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockNotifications);
      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
            read: false,
          }),
        })
      );
    });
  });

  describe("POST /api/notifications/mark-all-read", () => {
    it("marks all notifications as read for current user", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "test-user-id" },
      } as any);

      db.notification.updateMany.mockResolvedValueOnce({ count: 5 });

      const req = new NextRequest("http://localhost/api/notifications/mark-all-read", {
        method: "POST",
      });
      const res = await markAllRead(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.updated).toBe(5);
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id", read: false },
        data: { read: true },
      });
    });
  });

  describe("PATCH /api/notifications/[id]/read", () => {
    it("marks a single notification as read if owned by the user", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "test-user-id" },
      } as any);

      db.notification.findUnique.mockResolvedValueOnce({
        id: "notif-id-1",
        userId: "test-user-id",
        read: false,
      });

      db.notification.update.mockResolvedValueOnce({
        id: "notif-id-1",
        read: true,
      });

      const req = new NextRequest("http://localhost/api/notifications/notif-id-1/read", {
        method: "PATCH",
      });
      const res = await markSingleRead(req, {
        params: Promise.resolve({ id: "notif-id-1" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.read).toBe(true);
      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-id-1" },
        data: { read: true },
      });
    });

    it("returns 403 if user does not own the notification", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "other-user-id" },
      } as any);

      db.notification.findUnique.mockResolvedValueOnce({
        id: "notif-id-1",
        userId: "test-user-id",
        read: false,
      });

      const req = new NextRequest("http://localhost/api/notifications/notif-id-1/read", {
        method: "PATCH",
      });
      const res = await markSingleRead(req, {
        params: Promise.resolve({ id: "notif-id-1" }),
      });

      expect(res.status).toBe(403);
    });
  });
});

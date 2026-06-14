import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import { updateOnboardingFlags, checkAndActivateStudent } from "@/lib/actions/onboarding";

const db = prisma as any;

describe("Onboarding System Actions", () => {
  describe("checkAndActivateStudent", () => {
    it("activates student when all onboarding steps are complete", async () => {
      db.studentProfile.findUnique.mockResolvedValueOnce({
        userId: "student-1",
        gcrAssigned: true,
        groupAssigned: true,
        scheduleAssigned: true,
        financeApprovedFlag: true,
        status: "PAUSED",
      });

      db.notificationType.findUnique.mockResolvedValueOnce({
        id: "notif-type-id",
        name: "ONBOARDING_COMPLETE",
      });

      const activated = await checkAndActivateStudent("student-1");
      expect(activated).toBe(true);
      expect(db.studentProfile.update).toHaveBeenCalledWith({
        where: { userId: "student-1" },
        data: { status: "ACTIVE" },
      });
      expect(db.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "student-1",
            title: "Account Activated",
          }),
        })
      );
    });

    it("does not activate student if some onboarding steps are incomplete", async () => {
      db.studentProfile.findUnique.mockResolvedValueOnce({
        userId: "student-2",
        gcrAssigned: true,
        groupAssigned: false, // incomplete
        scheduleAssigned: true,
        financeApprovedFlag: true,
        status: "PAUSED",
      });

      const activated = await checkAndActivateStudent("student-2");
      expect(activated).toBe(false);
      expect(db.studentProfile.update).not.toHaveBeenCalled();
    });
  });

  describe("updateOnboardingFlags", () => {
    it("throws if unauthenticated", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce(null);

      await expect(
        updateOnboardingFlags("student-1", { gcrAssigned: true })
      ).rejects.toThrow("Unauthorized");
    });

    it("allows PR staff to update GCR, group, and schedule flags, assigning timestamps", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "pr-id-1", role: "staff", dept: "PR" },
      } as any);

      db.user.findUnique.mockResolvedValueOnce({
        id: "student-1",
        role: "student",
      });

      db.studentProfile.upsert.mockResolvedValueOnce({
        userId: "student-1",
        gcrAssigned: true,
        gcrAssignedAt: new Date(),
      });

      // Mock checkAndActivateStudent inner call
      db.studentProfile.findUnique.mockResolvedValueOnce({
        userId: "student-1",
        gcrAssigned: true,
        groupAssigned: false,
        scheduleAssigned: false,
        financeApprovedFlag: false,
      });

      const result = await updateOnboardingFlags("student-1", {
        gcrAssigned: true,
      });

      expect(result.activated).toBe(false);
      expect(db.studentProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "student-1" },
          update: expect.objectContaining({
            gcrAssigned: true,
            gcrAssignedAt: expect.any(Date),
          }),
        })
      );
    });

    it("does not allow PR staff to update financeApprovedFlag", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "pr-id-1", role: "staff", dept: "PR" },
      } as any);

      await expect(
        updateOnboardingFlags("student-1", { financeApprovedFlag: true })
      ).rejects.toThrow("Forbidden: Finance or Management required for financeApprovedFlag");
    });

    it("allows Finance staff to update financeApprovedFlag, assigning timestamp", async () => {
      const { auth } = await import("@/lib/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "fin-id-1", role: "staff", dept: "Finance" },
      } as any);

      db.user.findUnique.mockResolvedValueOnce({
        id: "student-1",
        role: "student",
      });

      db.studentProfile.upsert.mockResolvedValueOnce({
        userId: "student-1",
        financeApprovedFlag: true,
        financeApprovedAt: new Date(),
      });

      db.studentProfile.findUnique.mockResolvedValueOnce({
        userId: "student-1",
        gcrAssigned: true,
        groupAssigned: true,
        scheduleAssigned: true,
        financeApprovedFlag: true,
      });

      db.notificationType.findUnique.mockResolvedValueOnce({ id: "n-type" });

      const result = await updateOnboardingFlags("student-1", {
        financeApprovedFlag: true,
      });

      expect(db.studentProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "student-1" },
          update: expect.objectContaining({
            financeApprovedFlag: true,
            financeApprovedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});

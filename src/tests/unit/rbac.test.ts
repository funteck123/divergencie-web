import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/rbac";

const db = prisma as any;

describe("RBAC hasPermission resolution logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should always return true for MANAGEMENT role", async () => {
    const result = await hasPermission("u-1", "management", null, "INVOICES", "delete");
    expect(result).toBe(true);
    expect(db.portalPermission.findFirst).not.toHaveBeenCalled();
  });

  it("should fall back to code default for STUDENT role if no override row exists", async () => {
    db.portalPermission.findFirst.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue({ staffProfile: null });

    const viewResult = await hasPermission("u-2", "student", null, "INVOICES", "view");
    const editResult = await hasPermission("u-2", "student", null, "INVOICES", "edit");

    expect(viewResult).toBe(true);
    expect(editResult).toBe(false);
  });

  it("should respect individual user overrides first", async () => {
    // Mock user override allowing deletion of invoices
    db.portalPermission.findFirst.mockResolvedValueOnce({
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: false,
    });

    const result = await hasPermission("u-3", "student", null, "INVOICES", "delete");
    expect(result).toBe(true);
    // Verified user override table was queried for this specific user
    expect(db.portalPermission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "u-3" }),
      })
    );
  });

  it("should fall back to dept-level overrides if user override is absent", async () => {
    db.portalPermission.findFirst
      .mockResolvedValueOnce(null) // No user override
      .mockResolvedValueOnce({ // Dept override exists
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: false,
      });

    const result = await hasPermission("u-4", "staff", "Finance", "INVOICES", "create");
    expect(result).toBe(true);
    expect(db.portalPermission.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: null,
          dept: { name: { equals: "FINANCE", mode: "insensitive" } },
        }),
      })
    );
  });
});

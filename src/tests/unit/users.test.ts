import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import { getStaffMembers, getExternalUsers, toggleUserStatus } from "@/lib/actions/users";

const db = prisma as any;

describe("getStaffMembers", () => {
  it("returns staff and management users", async () => {
    const fakeStaff = [
      { id: "u1", name: "Alice", role: "staff", active: true },
      { id: "u2", name: "Bob", role: "management", active: true },
    ];
    db.user.findMany.mockResolvedValue(fakeStaff);

    const result = await getStaffMembers();

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { in: ["staff", "management"] },
        }),
      })
    );
    expect(result).toHaveLength(2);
  });

  it("filters by department when dept arg is provided", async () => {
    db.user.findMany.mockResolvedValue([]);
    await getStaffMembers("IT");

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { dept: "IT" },
            { subGroup: { startsWith: "IT_" } },
          ]),
        }),
      })
    );
  });

  it("throws when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    await expect(getStaffMembers()).rejects.toThrow("Unauthorized");
  });
});

describe("getExternalUsers", () => {
  it("returns student/parent/teacher/ambassador/candidate users", async () => {
    db.user.findMany.mockResolvedValue([]);
    await getExternalUsers();

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: {
            in: expect.arrayContaining(["student", "teacher", "parent"]),
          },
        }),
      })
    );
  });
});

describe("toggleUserStatus", () => {
  it("sets the user active field to the provided value", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "mgmt-id", email: "management@divergencie.com", role: "management" },
    } as any);
    db.user.update.mockResolvedValue({ id: "u1", active: false });
    await toggleUserStatus("u1", false);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { active: false },
      select: { id: true, active: true, name: true },
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import {
  getStudentAssignments,
  submitAssignment,
} from "@/lib/actions/progress";

const db = prisma as any;

describe("getStudentAssignments", () => {
  it("returns empty array when user is not found", async () => {
    db.user.findUnique.mockResolvedValue(null);

    const result = await getStudentAssignments("unknown@example.com");

    expect(result).toEqual([]);
  });

  it("returns assignments for a valid student", async () => {
    db.user.findUnique.mockResolvedValue({ id: "stu-1" });
    db.assignment.findMany.mockResolvedValue([
      { id: "a1", title: "Essay", status: "pending", dueDate: new Date() },
    ]);

    const result = await getStudentAssignments("student@test.com");

    expect(db.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "stu-1" }),
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Essay");
  });
});

describe("submitAssignment", () => {
  it("updates status to submitted and saves submission text", async () => {
    const updated = { id: "a1", status: "submitted", submission: "https://drive.google.com/link" };
    db.assignment.update.mockResolvedValue(updated);

    const result = await submitAssignment("a1", "https://drive.google.com/link");

    expect(db.assignment.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { submission: "https://drive.google.com/link", status: "submitted" },
    });
    expect(result.status).toBe("submitted");
  });

  it("propagates database errors", async () => {
    db.assignment.update.mockRejectedValue(new Error("DB error"));

    await expect(submitAssignment("bad-id", "text")).rejects.toThrow("DB error");
  });
});

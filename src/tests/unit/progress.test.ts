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
    db.taskAssignment.findMany.mockResolvedValue([
      { id: "a1", taskItemId: "ti-1", studentId: "stu-1", taskItem: { title: "Essay", dueDate: new Date() } },
    ]);

    const result = await getStudentAssignments("student@test.com");

    expect(db.taskAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "stu-1" }),
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].taskItem.title).toBe("Essay");
  });
});

describe("submitAssignment", () => {
  it("updates status to submitted and saves submission text", async () => {
    db.taskAssignment.findUnique.mockResolvedValue({
      taskItemId: "ti-1",
      studentId: "stu-1",
    });
    db.taskSubmission.upsert.mockResolvedValue({
      id: "ts-1",
      status: "submitted",
    });

    const result = await submitAssignment("a1", "https://drive.google.com/link");

    expect(db.taskAssignment.findUnique).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { taskItemId: true, studentId: true },
    });
    expect(db.taskSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskItemId_studentId: { taskItemId: "ti-1", studentId: "stu-1" } },
        update: expect.objectContaining({ status: "submitted" }),
      })
    );
    expect(result.id).toBe("a1");
  });

  it("propagates database errors", async () => {
    db.taskAssignment.findUnique.mockRejectedValue(new Error("DB error"));

    await expect(submitAssignment("bad-id", "text")).rejects.toThrow("DB error");
  });
});

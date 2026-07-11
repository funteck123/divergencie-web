import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import {
  getStudentSchedules,
  submitScheduleChangeRequest,
  getStudentAttendanceHistory,
  submitSessionFeedback,
} from "@/lib/actions/schedules";

const db = prisma as any;

describe("getStudentSchedules", () => {
  it("throws when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    await expect(getStudentSchedules("student@test.com")).rejects.toThrow("Unauthorized");
  });

  it("queries schedules for enrolled active services", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "stu-id", email: "student@test.com" } } as any);

    db.user.findUnique.mockResolvedValue({ id: "stu-id", email: "student@test.com" });
    db.studentEnrolmentItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        service: {
          serviceSchedules: [
            { id: "schedule-1", serviceId: "service-1", occurrences: [] },
          ],
        },
      },
    ]);

    const result = await getStudentSchedules("student@test.com");

    expect(db.studentEnrolmentItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "stu-id", isActive: true },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("schedule-1");
  });
});

describe("submitScheduleChangeRequest", () => {
  it("saves PENDING change request to database", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "stu-id", email: "student@test.com" } } as any);

    db.scheduleChangeRequest.create.mockResolvedValue({
      id: "req-1",
      scheduleId: "sched-1",
      status: "PENDING",
    });

    const result = await submitScheduleChangeRequest({
      scheduleId: "sched-1",
      requestType: "RESCHEDULE",
      recurrenceType: "ONE_OFF",
      proposedStartTime: new Date(),
      proposedEndTime: new Date(),
      reason: "Busy",
    });

    expect(db.scheduleChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduleId: "sched-1",
          requestedByUserId: "stu-id",
          status: "PENDING",
        }),
      })
    );
    expect(result.status).toBe("PENDING");
  });
});

describe("getStudentAttendanceHistory", () => {
  it("returns session attendance lists", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "stu-id", email: "student@test.com" } } as any);

    db.user.findUnique.mockResolvedValue({ id: "stu-id" });
    db.sessionAttendance.findMany.mockResolvedValue([
      { id: "att-1", status: "PRESENT", session: { subject: "Chemistry" } },
    ]);

    const result = await getStudentAttendanceHistory("student@test.com");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("PRESENT");
  });
});

describe("submitSessionFeedback", () => {
  it("saves stars and feedback text", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "stu-id", email: "student@test.com" } } as any);

    db.sessionAttendance.findUnique.mockResolvedValue({
      id: "att-1",
      studentId: "stu-id",
    });
    db.sessionAttendance.update.mockResolvedValue({
      id: "att-1",
      feedbackStars: 5,
      feedbackText: "Great class!",
    });

    const result = await submitSessionFeedback("att-1", 5, "Great class!");

    expect(db.sessionAttendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "att-1" },
        data: expect.objectContaining({
          feedbackStars: 5,
          feedbackText: "Great class!",
        }),
      })
    );
    expect(result.feedbackStars).toBe(5);
  });
});

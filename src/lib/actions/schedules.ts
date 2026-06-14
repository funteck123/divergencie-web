"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getStudentSchedules(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];

  const enrolmentItems = await prisma.studentEnrolmentItem.findMany({
    where: { studentId: user.id, isActive: true },
    include: {
      service: {
        include: {
          serviceSchedules: {
            include: {
              occurrences: {
                where: { isActive: true },
                include: {
                  sessionType: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return enrolmentItems
    .flatMap((item) => item.service?.serviceSchedules || [])
    .filter(Boolean);
}

export async function submitScheduleChangeRequest(data: {
  scheduleId: string;
  occurrenceId?: string;
  requestType: string; // "ADD" | "REMOVE" | "RESCHEDULE" | "PAUSE"
  recurrenceType: string;
  proposedStartTime?: Date;
  proposedEndTime?: Date;
  proposedDayOfWeek?: string;
  proposedDuration?: number;
  reason?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const req = await prisma.scheduleChangeRequest.create({
    data: {
      scheduleId: data.scheduleId,
      occurrenceId: data.occurrenceId || null,
      requestedByUserId: session.user.id,
      requestType: data.requestType,
      recurrenceType: data.recurrenceType,
      proposedStartTime: data.proposedStartTime || null,
      proposedEndTime: data.proposedEndTime || null,
      proposedDayOfWeek: data.proposedDayOfWeek || null,
      proposedDuration: data.proposedDuration || null,
      status: "PENDING",
    },
  });

  revalidatePath("/portal/student/classes");
  return req;
}

export async function getStudentAttendanceHistory(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];

  return await prisma.sessionAttendance.findMany({
    where: { studentId: user.id },
    include: {
      session: {
        include: {
          teacher: { select: { name: true } },
        },
      },
    },
    orderBy: { markedAt: "desc" },
    take: 100,
  });
}

export async function submitSessionFeedback(attendanceId: string, stars: number, text: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const attendance = await prisma.sessionAttendance.findUnique({
    where: { id: attendanceId },
  });
  if (!attendance) throw new Error("Attendance record not found");
  if (attendance.studentId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.sessionAttendance.update({
    where: { id: attendanceId },
    data: {
      feedbackStars: stars,
      feedbackText: text,
      feedbackGivenAt: new Date(),
    },
  });

  revalidatePath("/portal/student/classes");
  return updated;
}

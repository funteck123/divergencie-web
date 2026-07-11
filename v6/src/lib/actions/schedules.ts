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

export async function getTeacherScheduleData(teacherEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) return { sessions: [], changeRequests: [], contentItems: [] };

  const [sessions, changeRequests, contentItems] = await Promise.all([
    prisma.academicSession.findMany({
      where: { teacherId: teacher.id },
      include: { student: { select: { name: true, email: true } } },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.scheduleChangeRequest.findMany({
      where: { requestedByUserId: teacher.id },
      orderBy: { id: "desc" },
      take: 30,
    }),
    prisma.contentBankItem.findMany({
      where: { isActive: true },
      orderBy: { dateAdded: "desc" },
      take: 50,
    }),
  ]);

  return { sessions, changeRequests, contentItems };
}

export async function getStaffScheduleData(staffId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Find StaffServiceSchedule via StaffEnrolmentItem → StaffService → StaffServiceSchedule
  const enrolmentItems = await prisma.staffEnrolmentItem.findMany({
    where: { staffId, isActive: true },
    select: { staffServiceId: true },
  });
  const serviceIds = enrolmentItems.map((i: any) => i.staffServiceId);

  const schedule = serviceIds.length > 0
    ? await prisma.staffServiceSchedule.findFirst({
        where: { staffServiceId: { in: serviceIds } },
        include: {
          occurrences: { include: { history: { orderBy: { changedAt: "desc" } } } },
          changeRequests: { orderBy: { id: "desc" }, take: 20 },
        },
      })
    : null;

  return {
    schedule,
    occurrences: schedule?.occurrences ?? [],
    changeRequests: schedule?.changeRequests ?? [],
  };
}

export async function createStaffScheduleChangeRequest(data: {
  staffId: string;
  requestType: string;
  recurrenceType: string;
  proposedDayOfWeek?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  proposedDuration?: number;
  reason?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const enrolmentItems = await prisma.staffEnrolmentItem.findMany({
    where: { staffId: data.staffId, isActive: true },
    select: { staffServiceId: true },
  });
  const serviceIds = enrolmentItems.map((i: any) => i.staffServiceId);
  if (!serviceIds.length) throw new Error("No active staff service found");

  let schedule = await prisma.staffServiceSchedule.findFirst({
    where: { staffServiceId: { in: serviceIds } },
  });
  if (!schedule) {
    schedule = await prisma.staffServiceSchedule.create({
      data: { staffServiceId: serviceIds[0], isActive: true },
    });
  }

  const req = await prisma.staffScheduleChangeRequest.create({
    data: {
      scheduleId: schedule.id,
      requestedByUserId: data.staffId,
      requestType: data.requestType,
      recurrenceType: data.recurrenceType,
      proposedDayOfWeek: data.proposedDayOfWeek,
      proposedStartTime: data.proposedStartTime ? new Date(data.proposedStartTime) : undefined,
      proposedEndTime: data.proposedEndTime ? new Date(data.proposedEndTime) : undefined,
      proposedDuration: data.proposedDuration,
      status: "PENDING",
    },
  });

  revalidatePath("/portal/staff/shared/schedule");
  return req;
}

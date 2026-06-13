"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requirePRAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function createMapping(formData: FormData) {
  await requirePRAccess();

  const studentEmail = formData.get("studentEmail") as string;
  const teacherEmail = formData.get("teacherEmail") as string;
  const subject = formData.get("subject") as string;
  const batchCode = formData.get("batchCode") as string;

  if (!studentEmail || !teacherEmail || !subject || !batchCode) {
    throw new Error("Missing required fields for mapping.");
  }

  const student = await prisma.user.findUnique({ where: { email: studentEmail } });
  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });

  if (!student || student.role !== "student") throw new Error("Student not found.");
  if (!teacher || teacher.role !== "teacher") throw new Error("Teacher not found.");

  let group = await prisma.group.findUnique({ where: { code: batchCode } });

  if (group) {
    if (group.teacherId !== teacher.id) {
      throw new Error(`Group ${batchCode} is already assigned to another teacher.`);
    }
  } else {
    const categoryMap: Record<string, string> = {
      B: "B_GROUP",
      C: "C_GROUP",
      T: "T_GROUP",
    };
    const firstChar = batchCode.trim().charAt(0).toUpperCase();
    const groupCategory = categoryMap[firstChar] || "B_GROUP";

    group = await prisma.group.create({
      data: { code: batchCode, subject, teacherId: teacher.id, groupCategory },
    });
  }

  await prisma.group.update({
    where: { id: group.id },
    data: { students: { connect: { id: student.id } } },
  });

  revalidatePath("/portal/staff/pr/mapping");
  return { success: true };
}

export async function getMappings() {
  await requirePRAccess();

  const groups = await prisma.group.findMany({
    include: {
      teacher: { select: { name: true, email: true } },
      students: { select: { name: true, email: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const flattened = [];
  for (const group of groups) {
    for (const student of group.students) {
      flattened.push({
        id: `${group.id}-${student.id}`,
        student: student.name,
        studentEmail: student.email,
        subject: group.subject || "General",
        teacher: group.teacher?.name || "No Teacher",
        teacherEmail: group.teacher?.email || "N/A",
        batch: group.code,
        date: group.createdAt.toISOString().split("T")[0],
      });
    }
  }
  return flattened;
}

export async function deleteMapping(groupId: string, studentId: string) {
  await requirePRAccess();

  await prisma.group.update({
    where: { id: groupId },
    data: { students: { disconnect: { id: studentId } } },
  });
  revalidatePath("/portal/staff/pr/mapping");
}

export async function getTeachersAndStudents() {
  await requirePRAccess();

  const [teachers, students] = await Promise.all([
    prisma.user.findMany({ where: { role: "teacher", active: true }, select: { name: true, email: true } }),
    prisma.user.findMany({ where: { role: "student", active: true }, select: { name: true, email: true } }),
  ]);
  return { teachers, students };
}

export async function getAllSchedule() {
  await requirePRAccess();

  return await prisma.group.findMany({
    include: {
      teacher: { select: { name: true, email: true } },
      students: { select: { id: true, name: true, email: true } },
      sessions: {
        where: { status: { in: ["scheduled", "completed"] } },
        orderBy: { startTime: "asc" },
        take: 3,
        include: { student: { select: { name: true } } },
      },
    },
    orderBy: { code: "asc" },
  });
}

export async function getMissedSessions() {
  await requirePRAccess();

  const week = new Date();
  week.setDate(week.getDate() - 7);
  return await prisma.academicSession.findMany({
    where: { status: "missed", startTime: { gte: week } },
    include: {
      teacher: { select: { name: true } },
      student: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });
}

export async function rescheduleSession(sessionId: string, newStartTime: Date) {
  await requirePRAccess();

  const sess = await prisma.academicSession.findUnique({ where: { id: sessionId } });
  if (!sess) throw new Error("Session not found");
  const duration = sess.endTime.getTime() - sess.startTime.getTime();
  const updated = await prisma.academicSession.update({
    where: { id: sessionId },
    data: {
      startTime: newStartTime,
      endTime: new Date(newStartTime.getTime() + duration),
      status: "scheduled",
    },
  });
  revalidatePath("/portal/staff/shared/schedule");
  revalidatePath("/portal/teacher");
  return updated;
}

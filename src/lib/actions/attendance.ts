"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitAttendance(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "teacher" && actor.role !== "staff" && actor.role !== "management") {
    throw new Error("Forbidden");
  }

  const sessionId = formData.get("sessionId") as string;
  const teacherEmail = formData.get("teacherId") as string;
  const duration = parseInt(formData.get("duration") as string);
  const notes = formData.get("notes") as string;
  const wbLink = formData.get("wbLink") as string;
  const status = (formData.get("status") as string) || "present";

  if (!teacherEmail || isNaN(duration)) throw new Error("Missing required fields");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) throw new Error("Teacher not found");

  let actualSessionId = sessionId;
  let studentId = "";
  let sessSubject = "Session";
  let sessStartTime: Date | string = new Date();

  if (sessionId === "manual") {
    const studentEmail = formData.get("studentEmail") as string;
    const subject = formData.get("subject") as string;
    const dateStr = formData.get("date") as string;

    if (!studentEmail || !subject || !dateStr) {
      throw new Error("Manual entry requires student, subject, and date.");
    }

    const student = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (!student) throw new Error("Student not found");
    studentId = student.id;

    const newSession = await prisma.academicSession.create({
      data: {
        teacherId: teacher.id,
        studentId: student.id,
        subject,
        startTime: new Date(dateStr),
        endTime: new Date(new Date(dateStr).getTime() + duration * 60000),
        status: status === "present" ? "completed" : "missed",
      },
    });
    actualSessionId = newSession.id;
    sessSubject = subject;
    sessStartTime = new Date(dateStr);
  } else {
    const sess = await prisma.academicSession.findUnique({ where: { id: sessionId } });
    if (!sess) throw new Error("Session not found");
    if (sess.teacherId !== teacher.id) throw new Error("Unauthorized: not your session");
    studentId = sess.studentId;
    sessSubject = sess.subject;
    sessStartTime = sess.startTime;

    await prisma.academicSession.update({
      where: { id: sessionId },
      data: { status: status === "present" ? "completed" : "missed" },
    });
  }

  const attendance = await prisma.attendance.create({
    data: {
      sessionId: actualSessionId,
      studentId,
      duration,
      notes,
      wbLink: wbLink || undefined,
      status: status === "present" ? "present" : "absent",
    },
  });

  if (wbLink) {
    await prisma.recording.create({
      data: {
        title: `${sessSubject} — ${new Date(sessStartTime).toLocaleDateString("en-GB")}`,
        subject: sessSubject,
        videoUrl: wbLink,
        date: new Date(sessStartTime),
        duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
        category: "class",
      },
    });
    revalidatePath("/portal/student/recordings");
  }

  revalidatePath("/portal/teacher");
  revalidatePath("/portal/staff/pr/attendance");
  return attendance;
}

export async function getPendingAttendance(teacherEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) return [];

  return await prisma.academicSession.findMany({
    where: { teacherId: teacher.id, status: "scheduled", startTime: { lt: new Date() } },
    include: { student: { select: { name: true, email: true } } },
    orderBy: { startTime: "desc" },
    take: 100,
  });
}

export async function getAttendanceHistory(teacherEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) return [];

  return await prisma.attendance.findMany({
    where: { session: { teacherId: teacher.id } },
    include: { session: true, student: { select: { name: true } } },
    orderBy: { markedAt: "desc" },
    take: 200,
  });
}

export async function getStudentsForTeacher(teacherEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) return [];

  const groups = await prisma.group.findMany({
    where: { teacherId: teacher.id },
    include: {
      students: {
        where: { active: true },
        select: { name: true, email: true, id: true },
      },
    },
  });

  const studentsMap = new Map();
  groups.forEach((g) => g.students.forEach((s) => studentsMap.set(s.id, s)));
  return Array.from(studentsMap.values());
}

export async function logAttendance(formData: FormData) {
  return await submitAttendance(formData);
}

export async function getTeacherAttendance(teacherEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) return [];
  return await prisma.attendance.findMany({
    where: { session: { teacherId: teacher.id }, status: "present" },
    include: { session: { select: { subject: true, startTime: true, endTime: true } } },
    orderBy: { markedAt: "desc" },
    take: 200,
  });
}

export async function getStaffAttendanceLogs(userEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return [];
  return await prisma.attendance.findMany({
    where: { studentId: user.id },
    include: { session: true },
    orderBy: { markedAt: "desc" },
    take: 200,
  });
}

export async function logStaffAttendance(data: {
  userEmail: string;
  title: string;
  type: string;
  date: Date;
  duration: number;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: data.userEmail } });
  if (!user) throw new Error("User not found");
  const sess = await prisma.academicSession.create({
    data: {
      subject: data.type,
      topic: data.title,
      startTime: data.date,
      endTime: new Date(data.date.getTime() + data.duration * 3600000),
      teacherId: user.id,
      studentId: user.id,
      status: "completed",
    },
  });
  const log = await prisma.attendance.create({
    data: {
      sessionId: sess.id,
      studentId: user.id,
      status: "present",
      duration: Math.round(data.duration * 60),
      notes: data.notes,
    },
  });
  revalidatePath("/portal/staff/pr/attendance");
  revalidatePath("/portal/staff/shared/meetings");
  return log;
}

export async function getAllSubmissions() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  return await prisma.attendance.findMany({
    include: {
      student: { select: { name: true, role: true, dept: true } },
      session: { select: { subject: true, startTime: true, teacher: { select: { name: true } } } },
    },
    orderBy: { markedAt: "desc" },
    take: 50,
  });
}

export async function getTeacherSubmissionStatus() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const overdueSessions = await prisma.academicSession.findMany({
    where: { status: "scheduled", endTime: { lt: cutoff } },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      student: { select: { name: true } },
      attendances: { select: { id: true } },
    },
    orderBy: { endTime: "asc" },
  });
  return overdueSessions.filter((s: any) => s.attendances.length === 0);
}

export async function getAtRiskStudents() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const students = await prisma.user.findMany({
    where: { role: "student", active: true },
    include: { attendances: { take: 10, orderBy: { markedAt: "desc" } } },
  });

  return (
    await Promise.all(
      students.map(async (s: any) => {
        const recentAtt = s.attendances.slice(0, 5);
        const presentCount = recentAtt.filter((a: any) => a.status === "present").length;
        const attRate =
          recentAtt.length > 0 ? Math.round((presentCount / recentAtt.length) * 100) : 100;

        const overdueAssignments = await prisma.assignment.count({
          where: { studentId: s.id, status: "pending", dueDate: { lt: new Date() } },
        });

        const allProgress = await prisma.studentProgress.findMany({ where: { studentId: s.id } });
        const totalProg = allProgress.length;
        const doneProg = allProgress.filter((p: any) => p.completed).length;
        const progressPct = totalProg > 0 ? Math.round((doneProg / totalProg) * 100) : 100;

        const riskScore =
          (attRate < 80 ? 1 : 0) + (overdueAssignments > 0 ? 1 : 0) + (progressPct < 50 ? 1 : 0);
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          attRate,
          overdueAssignments,
          progressPct,
          riskScore,
          flags: [
            ...(attRate < 80 ? [`Low attendance (${attRate}%)`] : []),
            ...(overdueAssignments > 0
              ? [`${overdueAssignments} overdue assignment${overdueAssignments > 1 ? "s" : ""}`]
              : []),
            ...(progressPct < 50 ? [`Curriculum behind (${progressPct}%)`] : []),
          ],
        };
      })
    )
  )
    .filter((s: any) => s.riskScore > 0)
    .sort((a: any, b: any) => b.riskScore - a.riskScore);
}

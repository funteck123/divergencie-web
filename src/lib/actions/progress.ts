"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath, unstable_cache } from "next/cache";

export async function getStudentProgressStats(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [user, totalItems] = await Promise.all([
    prisma.user.findUnique({
      where: { email: studentEmail },
      include: {
        attendances: { include: { session: true } },
        mockResults: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.syllabusItem.count(),
  ]);

  if (!user) return null;

  const progressItems = await prisma.studentSyllabusProgress.findMany({
    where: { studentId: user.id },
    include: { syllabusItem: true },
  });

  const doneItems = progressItems.filter((p: any) => p.completed).length;
  const totalSessions = user.attendances.length;
  const presentSessions = user.attendances.filter((a: any) => a.status === "present").length;
  const attendanceRate =
    totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  const latestMock = user.mockResults[0];
  const mockScore = latestMock?.marksScored ?? 0;

  const bySubject: Record<string, { done: number; total: number }> = {};
  for (const p of progressItems) {
    const subj = (p.syllabusItem as any).subject;
    if (!bySubject[subj]) bySubject[subj] = { done: 0, total: 0 };
    bySubject[subj].total++;
    if (p.completed) bySubject[subj].done++;
  }

  const COLORS = ["var(--gold)", "var(--navy)", "#f43f5e", "#4f46e5", "#10b981"];
  const subjects = Object.entries(bySubject).map(([label, { done, total }], i) => ({
    label,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    color: COLORS[i % COLORS.length],
  }));

  return { attendanceRate, mockScore, chaptersDone: doneItems, totalChapters: totalItems, subjects };
}

export async function toggleChapterComplete(
  studentEmail: string,
  syllabusItemId: string,
  completed: boolean
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) throw new Error("User not found");

  await prisma.studentSyllabusProgress.upsert({
    where: { studentId_syllabusItemId: { studentId: user.id, syllabusItemId } },
    update: { completed },
    create: { studentId: user.id, syllabusItemId, completed },
  });

  revalidatePath("/portal/student/curriculum");
  revalidatePath("/portal/student");
}

export async function getStudentAssignments(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];
  // Use TaskAssignment + TaskItem as the ERD v23 replacement for the removed Assignment model
  return await prisma.taskAssignment.findMany({
    where: { studentId: user.id },
    include: { taskItem: true },
    orderBy: { taskItem: { dueDate: "asc" } },
    take: 100,
  });
}

export async function submitAssignment(taskAssignmentId: string, _submission: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // TaskSubmission is the ERD v23 submission model — create/upsert it
  const ta = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
    select: { taskItemId: true, studentId: true },
  });
  if (!ta) throw new Error("Assignment not found");

  await prisma.taskSubmission.upsert({
    where: { taskItemId_studentId: { taskItemId: ta.taskItemId, studentId: ta.studentId } },
    update: { status: "submitted", submittedAt: new Date() },
    create: {
      taskItemId: ta.taskItemId,
      studentId: ta.studentId,
      status: "submitted",
      totalMarks: 0,
      marksScored: 0,
      marksLost: 0,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/portal/student/assignments");
  return { id: taskAssignmentId };
}

const _getSyllabusAll = unstable_cache(
  async () => prisma.syllabusItem.findMany({ orderBy: [{ subject: "asc" }, { order: "asc" }] }),
  ["syllabus-items-all"], { revalidate: 3600 }
);

export async function getSyllabusItems(subject?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const all = await _getSyllabusAll();
  return subject ? all.filter((i: any) => i.subject === subject) : all;
}

export async function getStudentProgress(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];
  return await prisma.studentSyllabusProgress.findMany({
    where: { studentId: user.id },
    include: { syllabusItem: true },
  });
}

const _getAllRecordingsCached = unstable_cache(
  async () => prisma.recording.findMany({ orderBy: { date: "desc" } }),
  ["recordings-all"], { revalidate: 300 }
);

export async function getRecordings(subject?: string, search?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const all = await _getAllRecordingsCached();
  const filtered =
    subject && subject !== "All" ? all.filter((r: any) => r.subject === subject) : all;
  if (!search) return filtered;
  return filtered.filter(
    (r: any) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase())
  );
}

export async function createRecording(data: {
  title: string;
  subject: string;
  videoUrl: string;
  date: Date;
  duration: string;
  category: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "teacher" && actor.role !== "staff" && actor.role !== "management") {
    throw new Error("Forbidden");
  }

  const r = await prisma.recording.create({ data });
  revalidatePath("/portal/student/recordings");
  revalidatePath("/portal/teacher/attendance");
  return r;
}

export async function getStudentSessions(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];
  return await prisma.academicSession.findMany({
    where: { studentId: user.id },
    include: {
      teacher: { select: { name: true } },
      group: { select: { code: true } },
    },
    orderBy: { startTime: "asc" },
    take: 200,
  });
}

export async function createAcademicSession(data: {
  subject: string;
  startTime: Date;
  endTime: Date;
  zoomLink?: string;
  teacherId: string;
  studentId: string;
  groupId?: string;
  topic?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const sess = await prisma.academicSession.create({ data });
  revalidatePath("/portal/student/classes");
  revalidatePath("/portal/teacher");
  return sess;
}

export async function getStudentAnnouncements() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.announcement.findMany({
    where: { OR: [{ targetRole: "all" }, { targetRole: "student" }] },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

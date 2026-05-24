"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: {
  phone?: string;
  address?: string;
  bio?: string;
  grade?: string;
  board?: string;
  targetUni?: string;
  specialization?: string;
  hourlyRate?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...formData,
    },
  });

  revalidatePath("/portal");
  return { success: true };
}

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        students: true,
        parent: true,
      } as any,
    });
    return user;
  } catch (error) {
    console.error("[PROFILE] Database error:", error);
    throw error;
  }
}

export async function getLinkedChildren(parentEmail: string) {
  const parent = await prisma.user.findUnique({
    where: { email: parentEmail },
    include: {
      students: {
        include: {
          attendances: { take: 20, orderBy: { markedAt: 'desc' } },
          mockResults: { take: 3, orderBy: { createdAt: 'desc' } },
        }
      }
    } as any
  });
  if (!parent) return [];
  const students = (parent as any).students;

  // Batch: fetch ALL student progress in one query, then group
  const studentIds = students.map((s: any) => s.id);
  const [allProgress, allNextSessions] = await Promise.all([
    prisma.studentProgress.findMany({
      where: { studentId: { in: studentIds } },
      include: { syllabusItem: true }
    }),
    prisma.academicSession.findMany({
      where: { studentId: { in: studentIds }, startTime: { gte: new Date() }, status: 'scheduled' },
      orderBy: { startTime: 'asc' },
      include: { teacher: { select: { name: true } } },
      take: studentIds.length * 2,
    })
  ]);

  return students.map((s: any) => {
    const total = s.attendances.length;
    const present = s.attendances.filter((a: any) => a.status === 'present').length;
    const attPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const latestMock = s.mockResults[0];
    const progItems = allProgress.filter((p: any) => p.studentId === s.id);
    const doneItems = progItems.filter((p: any) => p.completed).length;
    const nextSession = allNextSessions.find((sess: any) => sess.studentId === s.id) ?? null;
    const subjMap: Record<string, { done: number; total: number }> = {};
    for (const p of progItems) {
      const subj = (p.syllabusItem as any).subject;
      if (!subjMap[subj]) subjMap[subj] = { done: 0, total: 0 };
      subjMap[subj].total++;
      if (p.completed) subjMap[subj].done++;
    }
    const progressItems = Object.entries(subjMap).map(([subject, { done, total }]) => ({
      subject, pct: total > 0 ? Math.round((done / total) * 100) : 0
    }));
    return {
      id: s.id, name: s.name, email: s.email,
      initials: s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      attendanceRate: attPct, attendanceSub: `${present} of ${total} classes`,
      mockScore: latestMock?.score ?? null,
      chaptersDone: doneItems, totalChapters: progItems.length,
      nextSession: nextSession ? {
        subject: nextSession.subject,
        time: new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        teacher: (nextSession as any).teacher?.name ?? '—'
      } : null,
      progress: progressItems,
    };
  });
}

export async function getUserProfile(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, role: true, dept: true,
      phone: true, bio: true, grade: true, board: true,
      targetUni: true, specialization: true, hourlyRate: true,
      active: true, supervisor: true, referralCode: true,
      subGroup: true, createdAt: true
    }
  });
}

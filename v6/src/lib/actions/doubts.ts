"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function logDoubt(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const body = formData.get("body") as string;
  const studentId = formData.get("studentId") as string;
  const syllabusItemId = formData.get("syllabusItemId") as string;

  if (!body || !studentId || !syllabusItemId) throw new Error("Missing required fields");

  const doubt = await prisma.doubt.create({
    data: { body, studentId, syllabusItemId, status: "pending" },
  });

  revalidatePath("/portal/student/curriculum");
  return doubt;
}

export async function getDoubts(studentId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.doubt.findMany({
    where: studentId ? { studentId } : {},
    include: { syllabusItem: true, student: true },
    orderBy: { id: "desc" },
    take: 100,
  });
}

export async function respondToDoubt(doubtId: string, response: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "teacher" && actor.role !== "staff" && actor.role !== "management") {
    throw new Error("Forbidden");
  }

  const doubt = await prisma.doubt.update({
    where: { id: doubtId },
    data: { response, status: "resolved" },
  });

  revalidatePath("/portal/student/curriculum");
  revalidatePath("/portal/staff");
  return doubt;
}

export async function getStudentDoubts(studentEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!user) return [];
  return await prisma.doubt.findMany({
    where: { studentId: user.id },
    include: {
      syllabusItem: {
        include: {
          syllabusChapter: true,
        },
      },
    },
    orderBy: { id: "desc" },
    take: 100,
  });
}

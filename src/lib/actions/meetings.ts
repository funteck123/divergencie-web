"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function requestMeeting(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const deptName = formData.get("dept") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const agenda = formData.get("agenda") as string;
  const creatorEmail = formData.get("creatorId") as string;

  if (!title || !deptName || !date || !time || !creatorEmail) throw new Error("Missing required fields");

  const [user, deptRecord] = await Promise.all([
    prisma.user.findUnique({ where: { email: creatorEmail } }),
    prisma.department.findFirst({ where: { name: deptName } }),
  ]);
  if (!user) throw new Error("User not found");

  const meeting = await prisma.generalMeeting.create({
    data: {
      title,
      deptId: deptRecord?.id ?? null,
      dateTime: new Date(`${date}T${time}`),
      agenda,
      status: "pending",
      participants: { create: { userId: user.id } },
    },
  });

  revalidatePath("/portal/staff/shared/meetings");
  return meeting;
}

export async function updateMeetingStatus(meetingId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const meeting = await prisma.generalMeeting.update({ where: { id: meetingId }, data: { status } });
  revalidatePath("/portal/staff/shared/meetings");
  return meeting;
}

export async function getMeetings(deptName?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  let deptId: string | undefined;
  if (deptName) {
    const d = await prisma.department.findFirst({ where: { name: deptName } });
    deptId = d?.id;
  }

  return await prisma.generalMeeting.findMany({
    where: deptId ? { deptId } : {},
    include: { participants: { include: { user: true } }, dept: true },
    orderBy: { dateTime: "asc" },
    take: 100,
  });
}

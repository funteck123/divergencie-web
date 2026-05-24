"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function requestMeeting(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const dept = formData.get("dept") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const agenda = formData.get("agenda") as string;
  const creatorEmail = formData.get("creatorId") as string;

  if (!title || !dept || !date || !time || !creatorEmail) {
    throw new Error("Missing required fields");
  }

  const user = await prisma.user.findUnique({ where: { email: creatorEmail } });
  if (!user) throw new Error("User not found");

  const dateTime = new Date(`${date}T${time}`);

  const meeting = await prisma.meeting.create({
    data: {
      title,
      dept,
      dateTime,
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

  const meeting = await prisma.meeting.update({ where: { id: meetingId }, data: { status } });
  revalidatePath("/portal/staff/shared/meetings");
  return meeting;
}

export async function getMeetings(dept?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.meeting.findMany({
    where: dept ? { OR: [{ dept }, { dept: "All Staff" }] } : {},
    include: { participants: { include: { user: true } } },
    orderBy: { dateTime: "asc" },
    take: 100,
  });
}

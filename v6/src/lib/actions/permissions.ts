"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getTicketPermissions(dept: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ticketPermission.findUnique({
    where: { department: dept }
  });
}

export async function getAllTicketPermissions() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ticketPermission.findMany();
}

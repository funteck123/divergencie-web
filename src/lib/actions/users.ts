"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getStaffMembers(dept?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.user.findMany({
    where: {
      role: { in: ["staff", "management"] },
      ...(dept ? { dept } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dept: true,
      subGroup: true,
      supervisor: true,
      active: true
    },
    orderBy: { name: 'asc' }
  });
}

export async function getExternalUsers(role?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.user.findMany({
    where: {
      role: { in: ["candidate", "student", "teacher", "ambassador", "parent"] },
      ...(role ? { role } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true
    },
    orderBy: { name: 'asc' }
  });
}

export async function toggleUserStatus(userId: string, active: boolean) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) throw new Error("Unauthorized");
  
  const isHRSupervisor = user.role === "staff" && user.dept === "HR" && user.subGroup === "HR_SUP";
  const isManagement = user.role === "management";

  if (!isHRSupervisor && !isManagement) {
    throw new Error("Forbidden: HR Supervisor or Management access required");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { active },
    select: { id: true, active: true, name: true }
  });
}

export async function createUser(data: {
  name: string; email: string; role: string; dept?: string; supervisor?: boolean;
}) {
  const session = await auth();
  const u = session?.user as any;
  if (!u || u.role !== 'management') throw new Error("Management only");

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already registered");

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      dept: data.dept ?? null,
      supervisor: data.supervisor ?? false,
      active: true,
    }
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/portal/management/users");
  return user;
}

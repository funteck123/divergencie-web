"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireHRAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getCandidates(query?: string) {
  await requireHRAccess();

  return await prisma.candidate.findMany({
    where: query
      ? { OR: [{ name: { contains: query } }, { status: { contains: query } }] }
      : undefined,
    include: { staffRole: true, candidateUserType: true },
    orderBy: { id: "desc" },
    take: 200,
  });
}

export async function createCandidate(data: {
  name: string;
  email: string;
  roleName?: string;
  cvLink?: string;
  notes?: string;
  outreach?: string;
}) {
  await requireHRAccess();

  const staffRole = data.roleName
    ? await prisma.staffRole.findFirst({ where: { name: data.roleName } })
    : null;

  const c = await prisma.candidate.create({
    data: {
      name: data.name,
      email: data.email,
      staffRoleId: staffRole?.id ?? null,
      cvLink: data.cvLink,
      notes: data.notes,
      outreach: data.outreach,
    },
  });
  revalidatePath("/portal/staff/hr/candidates");
  return c;
}

export async function updateCandidateStatus(id: string, status: string, notes?: string) {
  await requireHRAccess();

  const c = await prisma.candidate.update({
    where: { id },
    data: { status, ...(notes ? { notes } : {}) },
  });
  revalidatePath("/portal/staff/hr/candidates");
  return c;
}

export async function deleteCandidate(id: string) {
  await requireHRAccess();
  await prisma.candidate.delete({ where: { id } });
  revalidatePath("/portal/staff/hr/candidates");
}

export async function getStaffRecords(query?: string) {
  await requireHRAccess();

  return await prisma.user.findMany({
    where: {
      role: { in: ["staff", "teacher"] },
      ...(query
        ? { OR: [{ name: { contains: query } }, { email: { contains: query } }] }
        : {}),
    },
    select: {
      id: true, name: true, email: true, role: true, dept: true,
      active: true, supervisor: true, subGroup: true, createdAt: true,
      phone: true, specialization: true,
    },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export async function activateUser(id: string) {
  await requireHRAccess();
  const u = await prisma.user.update({ where: { id }, data: { active: true } });
  revalidatePath("/portal/staff/hr/records");
  return u;
}

export async function deactivateUser(id: string) {
  await requireHRAccess();
  const u = await prisma.user.update({ where: { id }, data: { active: false } });
  revalidatePath("/portal/staff/hr/records");
  return u;
}

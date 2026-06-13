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
      ? {
          OR: [
            { name: { contains: query } },
            { role: { contains: query } },
            { status: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { id: "desc" },
    take: 200,
  });
}

export async function createCandidate(data: {
  name: string;
  email: string;
  role: string;
  cvLink?: string;
  notes?: string;
  outreach?: string;
}) {
  await requireHRAccess();

  const c = await prisma.candidate.create({ data });
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
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { dept: { contains: query } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dept: true,
      active: true,
      supervisor: true,
      subGroup: true,
      createdAt: true,
      phone: true,
      specialization: true,
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

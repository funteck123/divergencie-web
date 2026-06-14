"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getStaffEnrolments(staffId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actor = session.user as any;
  if (actor.role !== "management" && actor.role !== "staff" && actor.id !== staffId) {
    throw new Error("Forbidden");
  }

  return await prisma.staffEnrolmentList.findMany({
    where: { staffId },
    include: {
      items: {
        include: {
          history: { orderBy: { changedAt: "desc" } },
        },
      },
    },
  });
}

export async function createStaffEnrolment(data: {
  staffId: string;
  serviceType: string;
  staffServiceId: string;
  startDate?: string;
  expectedHoursPerMonth?: number;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "management" && !(actor.role === "staff" && actor.dept?.toLowerCase() === "hr")) {
    throw new Error("Forbidden: Management or HR staff only");
  }

  let list = await prisma.staffEnrolmentList.findFirst({
    where: { staffId: data.staffId, serviceType: data.serviceType },
  });
  if (!list) {
    list = await prisma.staffEnrolmentList.create({
      data: { staffId: data.staffId, serviceType: data.serviceType, isActive: true },
    });
  }

  const item = await prisma.staffEnrolmentItem.create({
    data: {
      enrolmentListId: list.id,
      staffId: data.staffId,
      staffServiceId: data.staffServiceId,
      status: "ACTIVE",
      isActive: true,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      expectedHoursPerMonth: data.expectedHoursPerMonth ?? null,
    },
  });

  await prisma.staffEnrolmentItemStatusChangeLog.create({
    data: {
      enrolmentItemId: item.id,
      fromStatus: "NONE",
      toStatus: "ACTIVE",
      changedByUserId: actor.id,
      reason: data.notes ?? "Initial staff enrolment",
    },
  });

  revalidatePath("/portal/staff");
  return item;
}

export async function updateStaffEnrolmentStatus(itemId: string, newStatus: string, notes?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "management" && !(actor.role === "staff" && actor.dept?.toLowerCase() === "hr")) {
    throw new Error("Forbidden");
  }

  const existing = await prisma.staffEnrolmentItem.findUnique({ where: { id: itemId } });
  if (!existing) throw new Error("Staff enrolment item not found");

  const updated = await prisma.staffEnrolmentItem.update({
    where: { id: itemId },
    data: {
      status: newStatus,
      isActive: ["ACTIVE", "TRIAL", "WAITING_CONFIRMATION"].includes(newStatus),
      ...(newStatus === "ACTIVE" && { activatedAt: new Date() }),
      ...(newStatus === "CANCELLED" && { cancelledAt: new Date(), cancellationReason: notes }),
      ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
    },
  });

  await prisma.staffEnrolmentItemStatusChangeLog.create({
    data: {
      enrolmentItemId: itemId,
      fromStatus: existing.status,
      toStatus: newStatus,
      changedByUserId: actor.id,
      reason: notes ?? "Status updated",
    },
  });

  revalidatePath("/portal/staff");
  return updated;
}

export async function getStaffProfile(staffId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.staffProfile.findUnique({
    where: { userId: staffId },
    include: {
      staffRole: true,
      dept: true,
    },
  });
}

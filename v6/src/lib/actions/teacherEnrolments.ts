"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTeacherEnrolments(emailOrId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actor = session.user as any;
  const actorRole = actor.role?.toLowerCase();

  // Find target teacher user
  const teacher = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrId }, { id: emailOrId }] },
    select: { id: true, email: true },
  });
  if (!teacher) throw new Error("Teacher user not found");

  // Gating: a teacher can only view their own enrolments. Staff/Management can view any.
  if (actorRole === "teacher" && actor.id !== teacher.id) {
    throw new Error("Forbidden: Access denied");
  }
  if (actorRole !== "management" && actorRole !== "teacher" && !(actorRole === "staff" && actor.dept?.toLowerCase() === "pr")) {
    throw new Error("Forbidden: Access denied");
  }

  return await prisma.teacherEnrolmentList.findMany({
    where: { teacherId: teacher.id },
    include: {
      items: {
        include: {
          service: true,
          history: {
            orderBy: { changedAt: "desc" },
          },
        },
      },
    },
  });
}

export async function createTeacherEnrolment(data: {
  teacherId: string;
  serviceId: string;
  serviceType: string;
  startDate?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actor = session.user as any;
  const actorRole = actor.role?.toLowerCase();
  const actorDept = actor.dept?.toLowerCase();

  // Gating: Only PR/Ops staff or Management can enrol teachers
  if (actorRole !== "management" && !(actorRole === "staff" && actorDept === "pr")) {
    throw new Error("Forbidden: Access denied");
  }

  // Find or create enrolment list
  let list = await prisma.teacherEnrolmentList.findFirst({
    where: { teacherId: data.teacherId, serviceType: data.serviceType },
  });

  if (!list) {
    list = await prisma.teacherEnrolmentList.create({
      data: {
        teacherId: data.teacherId,
        serviceType: data.serviceType,
        isActive: true,
      },
    });
  }

  // Create enrolment item
  const item = await prisma.teacherEnrolmentItem.create({
    data: {
      enrolmentListId: list.id,
      teacherId: data.teacherId,
      serviceId: data.serviceId,
      status: "ACTIVE",
      isActive: true,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
    },
  });

  // Log status change
  await prisma.teacherEnrolmentItemStatusChangeLog.create({
    data: {
      enrolmentItemId: item.id,
      fromStatus: "NONE",
      toStatus: "ACTIVE",
      changedByUserId: actor.id,
      reason: data.notes ?? "Initial teacher enrolment",
    },
  });

  revalidatePath("/portal");
  return item;
}

export async function updateTeacherEnrolmentStatus(
  itemId: string,
  newStatus: string,
  notes?: string,
  endDate?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actor = session.user as any;
  const actorRole = actor.role?.toLowerCase();
  const actorDept = actor.dept?.toLowerCase();

  // Gating: Only PR/Ops staff or Management can update enrolment status
  if (actorRole !== "management" && !(actorRole === "staff" && actorDept === "pr")) {
    throw new Error("Forbidden: Access denied");
  }

  const existing = await prisma.teacherEnrolmentItem.findUnique({
    where: { id: itemId },
  });
  if (!existing) throw new Error("Teacher enrolment item not found");

  const updated = await prisma.teacherEnrolmentItem.update({
    where: { id: itemId },
    data: {
      status: newStatus,
      isActive: newStatus === "ACTIVE" || newStatus === "TRIAL" || newStatus === "WAITING_CONFIRMATION",
      endDate: endDate ? new Date(endDate) : existing.endDate,
      ...(newStatus === "ACTIVE" && { activatedAt: new Date() }),
      ...(newStatus === "CANCELLED" && { cancelledAt: new Date(), cancellationReason: notes }),
      ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
    },
  });

  // Log status change
  await prisma.teacherEnrolmentItemStatusChangeLog.create({
    data: {
      enrolmentItemId: itemId,
      fromStatus: existing.status,
      toStatus: newStatus,
      changedByUserId: actor.id,
      reason: notes ?? "Status updated",
    },
  });

  revalidatePath("/portal");
  return updated;
}

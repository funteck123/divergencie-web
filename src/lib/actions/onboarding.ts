"use server";

import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export async function checkAndActivateStudent(studentId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId }
  });

  if (
    profile &&
    profile.gcrAssigned &&
    profile.groupAssigned &&
    profile.scheduleAssigned &&
    profile.financeApprovedFlag
  ) {
    await prisma.studentProfile.update({
      where: { userId: studentId },
      data: { status: "ACTIVE" }
    });

    const notificationType = await prisma.notificationType.findUnique({
      where: { name: "ONBOARDING_COMPLETE" }
    });

    if (notificationType) {
      await prisma.notification.create({
        data: {
          userId: studentId,
          notificationTypeId: notificationType.id,
          title: "Account Activated",
          body: "Your onboarding is complete and your portal is now active!"
        }
      });
    }

    return true;
  }

  return false;
}

export async function updateOnboardingFlags(
  studentId: string,
  flags: {
    gcrAssigned?: boolean;
    groupAssigned?: boolean;
    scheduleAssigned?: boolean;
    financeApprovedFlag?: boolean;
  }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) throw new Error("Unauthorized");

  const isPR = user.role === "staff" && user.dept === "PR";
  const isFinance = user.role === "staff" && user.dept === "Finance";
  const isManagement = user.role === "management";

  if (!isPR && !isFinance && !isManagement) {
    throw new Error("Forbidden: Access denied");
  }

  // Validate department ownership of specific flags
  const data: any = {};
  if (flags.gcrAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for gcrAssigned");
    }
    data.gcrAssigned = flags.gcrAssigned;
    data.gcrAssignedAt = flags.gcrAssigned ? new Date() : null;
  }
  if (flags.groupAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for groupAssigned");
    }
    data.groupAssigned = flags.groupAssigned;
    data.groupAssignedAt = flags.groupAssigned ? new Date() : null;
  }
  if (flags.scheduleAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for scheduleAssigned");
    }
    data.scheduleAssigned = flags.scheduleAssigned;
    data.scheduleAssignedAt = flags.scheduleAssigned ? new Date() : null;
  }
  if (flags.financeApprovedFlag !== undefined) {
    if (!isFinance && !isManagement) {
      throw new Error("Forbidden: Finance or Management required for financeApprovedFlag");
    }
    data.financeApprovedFlag = flags.financeApprovedFlag;
    data.financeApprovedAt = flags.financeApprovedFlag ? new Date() : null;
  }

  // Check if student exists
  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "student" }
  });
  if (!student) throw new Error("Student not found");

  const profile = await prisma.studentProfile.upsert({
    where: { userId: studentId },
    update: data,
    create: {
      userId: studentId,
      status: "PAUSED", // default when onboarding is ongoing
      ...data
    }
  });

  const activated = await checkAndActivateStudent(studentId);

  return { profile, activated };
}

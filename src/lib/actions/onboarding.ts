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

    await prisma.notification.create({
      data: {
        userId: studentId,
        type: "ONBOARDING_COMPLETE",
        title: "Account Activated",
        message: "Your onboarding is complete and your portal is now active!"
      }
    });

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
  const data: typeof flags = {};
  if (flags.gcrAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for gcrAssigned");
    }
    data.gcrAssigned = flags.gcrAssigned;
  }
  if (flags.groupAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for groupAssigned");
    }
    data.groupAssigned = flags.groupAssigned;
  }
  if (flags.scheduleAssigned !== undefined) {
    if (!isPR && !isManagement) {
      throw new Error("Forbidden: PR or Management required for scheduleAssigned");
    }
    data.scheduleAssigned = flags.scheduleAssigned;
  }
  if (flags.financeApprovedFlag !== undefined) {
    if (!isFinance && !isManagement) {
      throw new Error("Forbidden: Finance or Management required for financeApprovedFlag");
    }
    data.financeApprovedFlag = flags.financeApprovedFlag;
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

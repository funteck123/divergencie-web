"use server";

import { auth } from "@/lib/auth";
import { BUSINESS } from "@/lib/config";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAmbassadorData(email: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      referrals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return null;

  if (!user.referralCode) {
    const namePart = (user.name || "Ambassador").split(" ")[0].toUpperCase();
    const code = `DC-${namePart}-${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.user.update({ where: { email }, data: { referralCode: code } });
    user.referralCode = code;
  }

  const earnings = {
    commission:
      user.referrals.filter((r) => r.status === "converted").length *
      BUSINESS.AMBASSADOR_COMMISSION_PER_REFERRAL,
    allowance: BUSINESS.AMBASSADOR_TIER1_ALLOWANCE,
    total: 0,
  };
  earnings.total = earnings.commission + earnings.allowance;

  return { user, referrals: user.referrals, earnings };
}

export async function logReferral(
  ambassadorEmail: string,
  prospectName: string,
  prospectEmail: string,
  source: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const ambassador = await prisma.user.findUnique({ where: { email: ambassadorEmail } });
  if (!ambassador) throw new Error("Ambassador not found");
  const ref = await prisma.referral.create({
    data: {
      referrerId: ambassador.id,
      code: `${ambassador.id}-${Date.now()}`,
      status: "pending",
    },
  });
  revalidatePath("/portal/ambassador");
  return ref;
}

export async function getAllAmbassadors() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (user.role !== "staff" && user.role !== "management") throw new Error("Forbidden");

  const ambs = await prisma.user.findMany({
    where: { role: "ambassador", active: true },
    include: { referrals: true },
    orderBy: { name: "asc" },
  });
  return ambs.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    referralCode: a.referralCode,
    totalReferrals: a.referrals.length,
    converted: a.referrals.filter((r) => r.status === "converted").length,
    earnings: a.referrals.filter((r) => r.status === "converted").length * 25 + 150,
  }));
}

export async function getAmbassadorProfile(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorProfile.findUnique({
    where: { userId },
  });
}

export async function upsertAmbassadorProfile(userId: string, data: {
  cohort?: string;
  referralCode?: string;
  programmeDuration?: string;
  programmeStart?: string;
  programmeEnd?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const profile = await prisma.ambassadorProfile.upsert({
    where: { userId },
    update: {
      cohort: data.cohort,
      programmeDuration: data.programmeDuration,
      programmeStart: data.programmeStart ? new Date(data.programmeStart) : undefined,
      programmeEnd: data.programmeEnd ? new Date(data.programmeEnd) : undefined,
    },
    create: {
      userId,
      cohort: data.cohort,
      referralCode: data.referralCode,
      programmeDuration: data.programmeDuration,
      programmeStart: data.programmeStart ? new Date(data.programmeStart) : undefined,
      programmeEnd: data.programmeEnd ? new Date(data.programmeEnd) : undefined,
    },
  });
  revalidatePath("/portal/ambassador/profile");
  return profile;
}

export async function getAmbassadorEnrolments(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorEnrolmentList.findMany({
    where: { ambassadorId },
    include: {
      items: {
        include: {
          history: { orderBy: { changedAt: "desc" } },
          ambassadorService: { select: { title: true, serviceType: true, rate: true, currency: true } },
        },
      },
    },
  });
}

export async function getAmbassadorServices() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorService.findMany({
    where: { isActive: true },
    include: { programmeList: true },
  });
}

export async function getAmbassadorProgramme(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const services = await prisma.ambassadorService.findMany({
    where: { isActive: true },
    include: {
      programmeList: {
        include: {
          contentLists: { include: { items: { orderBy: { order: "asc" }, include: { progressList: { take: 1 } }, take: 30 } } },
          timelineLists: { include: { items: { orderBy: { weekNumber: "asc" }, take: 20 } } },
        },
      },
    },
    take: 5,
  });

  return services;
}

export async function getAmbassadorCommissions(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorCommissionList.findMany({
    where: { ambassadorId },
    include: {
      items: {
        include: {
          history: { orderBy: { changedAt: "desc" }, take: 5 },
          changes: { orderBy: { changedAt: "desc" }, take: 5 },
          studentEnrolmentItem: {
            select: {
              id: true,
              status: true,
              enrolmentList: { select: { student: { select: { name: true, email: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function getAmbassadorClaims(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorClaim.findMany({
    where: { ambassadorId, isActive: true },
    include: {
      lineItems: true,
      history: { orderBy: { changedAt: "desc" }, take: 10 },
      paychecks: { include: { history: { orderBy: { changedAt: "desc" }, take: 5 } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAmbassadorClaim(data: {
  ambassadorId: string;
  month: string;
  currency?: string;
  notes?: string;
  commissionAmount?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const claim = await prisma.ambassadorClaim.create({
    data: {
      ambassadorId: data.ambassadorId,
      month: data.month,
      currency: data.currency ?? "MYR",
      notes: data.notes,
      commissionAmount: data.commissionAmount ?? 0,
      status: "pending",
    },
  });
  await prisma.ambassadorClaimStatusChangeLog.create({
    data: {
      claimId: claim.id,
      fromStatus: "",
      toStatus: "pending",
      changedByUserId: (session.user as any).id,
    },
  });
  revalidatePath("/portal/ambassador/claims");
  return claim;
}

export async function getAmbassadorMeetings(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.ambassadorMeetingAttendance.findMany({
    where: { ambassadorId },
    include: {
      meeting: {
        include: {
          sessionType: { select: { name: true } },
          statusChangeLogs: { orderBy: { changedAt: "desc" }, take: 5 },
        },
      },
    },
    orderBy: { meeting: { startTime: "desc" } },
    take: 50,
  });
}

export async function getAmbassadorScheduleData(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const enrolments = await prisma.ambassadorEnrolmentList.findMany({
    where: { ambassadorId, isActive: true },
    select: { items: { select: { ambassadorServiceId: true, isActive: true } } },
  });
  const serviceIds = enrolments.flatMap(e => e.items.filter(i => i.isActive).map(i => i.ambassadorServiceId));

  return await prisma.ambassadorServiceSchedule.findMany({
    where: { ambassadorServiceId: { in: serviceIds } },
    include: {
      ambassadorService: { select: { title: true, serviceType: true } },
      occurrences: {
        include: {
          sessionType: { select: { name: true } },
          history: { orderBy: { changedAt: "desc" }, take: 5 },
        },
        orderBy: { startTime: "asc" },
      },
      changeRequests: {
        orderBy: { id: "desc" },
        take: 10,
      },
    },
  });
}

export async function getAmbassadorTests(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const services = await prisma.ambassadorService.findMany({
    where: { isActive: true },
    include: {
      programmeList: {
        include: {
          testLists: {
            include: {
              testItems: {
                include: {
                  results: {
                    where: { ambassadorId },
                    take: 1,
                  },
                },
                orderBy: { scheduledDate: "asc" },
              },
            },
            where: { isActive: true },
          },
        },
      },
    },
    take: 5,
  });
  return services;
}

export async function createAmbassadorScheduleChangeRequest(data: {
  scheduleId: string;
  requestType: string;
  recurrenceType: string;
  proposedDayOfWeek?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  proposedDuration?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const req = await prisma.ambassadorScheduleChangeRequest.create({
    data: {
      scheduleId: data.scheduleId,
      requestedByUserId: (session.user as any).id,
      requestType: data.requestType,
      recurrenceType: data.recurrenceType,
      proposedDayOfWeek: data.proposedDayOfWeek,
      proposedStartTime: data.proposedStartTime ? new Date(data.proposedStartTime) : undefined,
      proposedEndTime: data.proposedEndTime ? new Date(data.proposedEndTime) : undefined,
      proposedDuration: data.proposedDuration,
      status: "PENDING",
    },
  });
  revalidatePath("/portal/ambassador/meetings");
  return req;
}

export async function getAmbassadorReferrals(referrerId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.referral.findMany({
    where: { referrerId, isActive: true },
    include: {
      clicks: { orderBy: { clickedAt: "desc" }, take: 20 },
      referrer: { select: { name: true, email: true, referralCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReferral(data: { referrerId: string; code: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const referral = await prisma.referral.create({
    data: {
      referrerId: data.referrerId,
      code: data.code,
      status: "pending",
    },
  });
  revalidatePath("/portal/ambassador/referrals");
  return referral;
}

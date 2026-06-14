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
          timelineLists: { include: { items: { orderBy: { order: "asc" }, take: 20 } } },
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

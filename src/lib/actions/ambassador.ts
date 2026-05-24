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
    const code = `DC-${user.name.split(" ")[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

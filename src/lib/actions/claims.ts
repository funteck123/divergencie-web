"use server";

import { auth } from "@/lib/auth";
import { BUSINESS } from "@/lib/config";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitClaim(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "teacher" && actor.role !== "staff" && actor.role !== "management") {
    throw new Error("Forbidden");
  }

  const userId = formData.get("userId") as string;
  const month = formData.get("month") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const notes = formData.get("notes") as string;

  if (!userId || !month || isNaN(amount)) throw new Error("Missing required fields");

  // Fetch the user's department for budget accounting
  const claimant = await prisma.user.findUnique({
    where: { id: userId },
    select: { dept: true }
  });
  const dept = claimant?.dept || "Finance";

  const claim = await prisma.claim.create({
    data: { userId, month, amount, notes, status: "pending", dept },
  });

  revalidatePath("/portal/staff/finance/claims");
  return claim;
}

export async function getClaims(userId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.claim.findMany({
    where: userId ? { userId } : {},
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateClaimStatus(claimId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const claim = await prisma.claim.update({ where: { id: claimId }, data: { status } });
  revalidatePath("/portal/staff/finance/claims");
  return claim;
}

export async function getMonthlyStats(userEmail: string, month: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, hourlyRate: true },
  });
  if (!user)
    return { events: 0, hours: 0, estimatedAmount: 0, hourlyRate: BUSINESS.DEFAULT_TEACHER_HOURLY_RATE };

  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1 ${year}`).getMonth();
  const start = new Date(parseInt(year), monthIndex, 1);
  const end = new Date(parseInt(year), monthIndex + 1, 0, 23, 59, 59);

  const attendances = await prisma.sessionAttendance.findMany({
    where: { studentId: user.id, status: "PRESENT", markedAt: { gte: start, lte: end } },
    include: { session: true },
  });
  const totalHours = attendances.reduce((s: number, a: any) => s + (a.session?.durationHours ?? 1.0), 0);
  const hours = Math.round(totalHours * 100) / 100;
  const rate = user.hourlyRate ?? BUSINESS.DEFAULT_TEACHER_HOURLY_RATE;
  return { events: attendances.length, hours, estimatedAmount: Math.round(hours * rate * 100) / 100, hourlyRate: rate };
}

export async function getTeacherClaims(userId?: string) {
  return await getClaims(userId);
}

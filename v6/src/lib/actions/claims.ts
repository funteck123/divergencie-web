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
  const hours = parseFloat(formData.get("hours") as string) || 0;
  const sessions = parseInt(formData.get("sessions") as string) || 0;
  const rateApplied = parseFloat(formData.get("rateApplied") as string) || 0;
  const enrolmentListId = formData.get("enrolmentListId") as string | null;
  const claimantType = actor.role === "teacher" ? "TEACHER" : "STAFF";

  if (!userId || !month || isNaN(amount)) throw new Error("Missing required fields");

  const deptRecord = await prisma.department.findFirst({ where: { name: "Finance" } });

  const claim = await prisma.claim.create({
    data: {
      userId,
      month,
      amount,
      currency: "GBP",
      notes,
      status: "SUBMITTED",
      deptId: deptRecord?.id ?? null,
      claimantType,
      hours: hours || null,
      sessions: sessions || null,
      rateApplied: rateApplied || null,
      enrolmentListId: enrolmentListId || null,
    },
  });

  // Log initial status
  await prisma.claimStatusChangeLog.create({
    data: {
      claimId: claim.id,
      fromStatus: "NONE",
      toStatus: "SUBMITTED",
      changedByUserId: actor.id,
      reason: "Teacher submitted claim",
    },
  });

  revalidatePath("/portal/staff/finance/claims");
  revalidatePath("/portal/teacher/payment-claims");
  return claim;
}

export async function getClaims(userId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.claim.findMany({
    where: userId ? { userId } : {},
    include: {
      user: { select: { name: true, email: true, role: true } },
      history: { orderBy: { changedAt: "desc" }, take: 5 },
      paychecks: {
        include: {
          history: { orderBy: { changedAt: "desc" }, take: 3 },
          lineItems: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateClaimStatus(claimId: string, status: string, reason?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const existing = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!existing) throw new Error("Claim not found");

  const claim = await prisma.claim.update({
    where: { id: claimId },
    data: { status },
  });

  await prisma.claimStatusChangeLog.create({
    data: {
      claimId,
      fromStatus: existing.status,
      toStatus: status,
      changedByUserId: actor.id,
      reason: reason ?? `Status updated to ${status}`,
    },
  });

  revalidatePath("/portal/staff/finance/claims");
  return claim;
}

export async function createPaycheck(data: {
  claimId: string;
  recipientId: string;
  month: string;
  subtotal: number;
  deductionsApplied?: number;
  notes?: string;
  enrolmentListId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden: Finance staff only");

  const net = data.subtotal - (data.deductionsApplied ?? 0);

  const paycheck = await prisma.paycheck.create({
    data: {
      claimId: data.claimId,
      recipientId: data.recipientId,
      month: data.month,
      subtotal: data.subtotal,
      deductionsApplied: data.deductionsApplied ?? 0,
      netAmount: net,
      dueAmount: net,
      currency: "GBP",
      status: "PENDING",
      notes: data.notes ?? null,
      enrolmentListId: data.enrolmentListId ?? null,
    },
  });

  await prisma.paycheckStatusChangeLog.create({
    data: {
      paycheckId: paycheck.id,
      fromStatus: "NONE",
      toStatus: "PENDING",
      changedByUserId: actor.id,
      reason: "Paycheck created from approved claim",
    },
  });

  // Mark claim as PENDING too
  await prisma.claim.update({ where: { id: data.claimId }, data: { status: "PENDING" } });
  await prisma.claimStatusChangeLog.create({
    data: {
      claimId: data.claimId,
      fromStatus: "APPROVED",
      toStatus: "PENDING",
      changedByUserId: actor.id,
      reason: "Paycheck raised",
    },
  });

  revalidatePath("/portal/staff/finance/claims");
  return paycheck;
}

export async function updatePaycheckStatus(paycheckId: string, status: string, reason?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const existing = await prisma.paycheck.findUnique({ where: { id: paycheckId } });
  if (!existing) throw new Error("Paycheck not found");

  const paycheck = await prisma.paycheck.update({
    where: { id: paycheckId },
    data: { status },
  });

  await prisma.paycheckStatusChangeLog.create({
    data: {
      paycheckId,
      fromStatus: existing.status,
      toStatus: status,
      changedByUserId: actor.id,
      reason: reason ?? `Status → ${status}`,
    },
  });

  revalidatePath("/portal/staff/finance/claims");
  return paycheck;
}

export async function recordPaycheckPayment(data: {
  paycheckId: string;
  amount: number;
  receiptLink?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const paycheck = await prisma.paycheck.findUnique({
    where: { id: data.paycheckId },
    select: { recipientId: true },
  });
  if (!paycheck) throw new Error("Paycheck not found");

  const record = await prisma.paymentRecord.create({
    data: {
      entityType: "PAYCHECK",
      entityId: data.paycheckId,
      paidByUserId: actor.id,
      amount: data.amount,
      currency: "GBP",
      receiptLink: data.receiptLink ?? null,
      notes: data.notes ?? null,
      status: "paid",
      paidAt: new Date(),
    },
  });

  await updatePaycheckStatus(data.paycheckId, "PAID", "Payment recorded");
  revalidatePath("/portal/teacher/payment-claims");
  return record;
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

export async function getTeacherPaychecks(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.paycheck.findMany({
    where: { recipientId: userId },
    include: {
      history: { orderBy: { changedAt: "desc" } },
      lineItems: true,
      claim: { select: { month: true, amount: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

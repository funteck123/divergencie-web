"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath, unstable_cache } from "next/cache";

async function requireFinanceAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");
  return actor;
}

export async function getInvoices(query?: string) {
  await requireFinanceAccess();

  const all = await prisma.studentInvoice.findMany({
    orderBy: { issuedAt: "desc" },
    include: { student: true },
    take: 500,
  });

  const mapped = all.map((inv: any) => ({
    ...inv,
    amount: inv.netAmount,
  }));

  if (!query) return mapped;
  return mapped.filter(
    (inv: any) =>
      inv.student?.name?.toLowerCase().includes(query.toLowerCase()) ||
      inv.studentId?.toLowerCase().includes(query.toLowerCase()) ||
      inv.status.toLowerCase().includes(query.toLowerCase())
  );
}

export async function createInvoice(data: {
  studentId: string;
  month: string;
  amount: number;
  status?: string;
}) {
  await requireFinanceAccess();

  const inv = await prisma.studentInvoice.create({
    data: {
      studentId: data.studentId,
      month: data.month,
      netAmount: data.amount,
      dueAmount: data.amount,
      currency: "GBP",
      status: data.status ?? "draft",
    },
  });
  revalidatePath("/portal/staff/finance/invoices");
  revalidatePath("/portal/parent/fees");
  return {
    ...inv,
    amount: inv.netAmount,
  };
}

export async function updateInvoiceStatus(id: string, status: string) {
  await requireFinanceAccess();

  const inv = await prisma.studentInvoice.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/portal/staff/finance/invoices");
  revalidatePath("/portal/parent/fees");
  return {
    ...inv,
    amount: inv.netAmount,
  };
}

export async function getInvoiceStats() {
  await requireFinanceAccess();

  const invoices = await prisma.studentInvoice.findMany({ take: 1000 });
  const total = invoices.reduce((s: number, i: any) => s + i.netAmount, 0);
  const collected = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.netAmount, 0);
  const overdue = invoices.filter((i: any) => i.status === "overdue").length;
  return { total, collected, pending: total - collected, overdue };
}

const _getRateItemsCached = unstable_cache(
  async () =>
    prisma.rateItem.findMany({
      orderBy: [{ rateList: { service: { subjectName: "asc" } } }, { country: "asc" }],
      include: {
        rateList: {
          include: {
            service: true,
          },
        },
      },
    }),
  ["rate-items"],
  { revalidate: 3600 }
);

export async function getRateCards() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const rateItems = await _getRateItemsCached();
  return rateItems.map((item: any) => ({
    id: item.id,
    course: item.rateList?.service?.subjectName || "Coaching",
    country: item.country,
    groupCode: "C", // Default individual code expected by UI
    rateGBP: item.clientRate,
  }));
}

export async function upsertRateCard(data: {
  course: string;
  country: string;
  groupCode: string;
  rateGBP: number;
}) {
  await requireFinanceAccess();

  // Find the service first
  const service = await prisma.service.findFirst({
    where: { subjectName: data.course },
  });
  if (!service) throw new Error(`Service not found for course: ${data.course}`);

  // Find or create rateList for this service
  let rateList = await prisma.rateList.findUnique({
    where: { serviceId: service.id },
  });
  if (!rateList) {
    rateList = await prisma.rateList.create({
      data: { serviceId: service.id },
    });
  }

  // Find or create rateItem
  const existingItem = await prisma.rateItem.findFirst({
    where: { rateListId: rateList.id, country: data.country },
  });

  let item;
  if (existingItem) {
    item = await prisma.rateItem.update({
      where: { id: existingItem.id },
      data: { clientRate: data.rateGBP },
    });
  } else {
    item = await prisma.rateItem.create({
      data: {
        rateListId: rateList.id,
        country: data.country,
        currency: "GBP",
        clientRate: data.rateGBP,
        staffRate: 0,
      },
    });
  }

  revalidatePath("/portal/staff/finance/rates");
  
  return {
    id: item.id,
    course: data.course,
    country: item.country,
    groupCode: data.groupCode,
    rateGBP: item.clientRate,
  };
}

export async function getParentInvoices(parentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const students = await prisma.user.findMany({
    where: { parentId },
    select: { id: true },
  });
  const ids = students.map((s: any) => s.id);
  const invoices = await prisma.studentInvoice.findMany({
    where: { studentId: { in: ids } },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
  return invoices.map((i: any) => ({
    ...i,
    amount: i.netAmount,
  }));
}

export async function getClaimsForApproval() {
  await requireFinanceAccess();

  return await prisma.claim.findMany({
    where: { status: { in: ["SUBMITTED", "PENDING", "pending", "submitted"] } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      history: { orderBy: { changedAt: "desc" }, take: 10 },
      paychecks: { select: { id: true, netAmount: true, status: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function approveClaim(id: string) {
  await requireFinanceAccess();
  const session = await auth();

  const existing = await prisma.claim.findUnique({ where: { id } });
  if (!existing) throw new Error("Claim not found");

  const c = await prisma.claim.update({ where: { id }, data: { status: "APPROVED" } });
  await prisma.claimStatusChangeLog.create({
    data: { claimId: id, fromStatus: existing.status, toStatus: "APPROVED", changedByUserId: (session!.user as any).id },
  });
  revalidatePath("/portal/management");
  revalidatePath("/portal/management/budget");
  revalidatePath("/portal/teacher/payment-claims");
  revalidatePath("/portal/staff/finance/claims");
  return c;
}

export async function rejectClaim(id: string, reason?: string) {
  await requireFinanceAccess();
  const session = await auth();

  const existing = await prisma.claim.findUnique({ where: { id } });
  if (!existing) throw new Error("Claim not found");

  const c = await prisma.claim.update({ where: { id }, data: { status: "REJECTED" } });
  await prisma.claimStatusChangeLog.create({
    data: { claimId: id, fromStatus: existing.status, toStatus: "REJECTED", changedByUserId: (session!.user as any).id, reason },
  });
  revalidatePath("/portal/management");
  revalidatePath("/portal/management/budget");
  revalidatePath("/portal/staff/finance/claims");
  return c;
}

export async function getBudgetOverview() {
  await requireFinanceAccess();

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const [claims, invoices] = await Promise.all([
    prisma.claim.findMany({
      where: { status: { in: ["approved", "paid"] }, createdAt: { gte: cutoff } },
    }),
    prisma.studentInvoice.findMany({ where: { issuedAt: { gte: cutoff } }, take: 1000 }),
  ]);
  const totalPaid = claims
    .filter((c: any) => c.status === "paid")
    .reduce((s: number, c: any) => s + c.amount, 0);
  const totalApproved = claims
    .filter((c: any) => c.status === "approved")
    .reduce((s: number, c: any) => s + c.amount, 0);
  const revenue = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.netAmount, 0);
  const pending = invoices
    .filter((i: any) => i.status !== "paid")
    .reduce((s: number, i: any) => s + i.netAmount, 0);
  return { totalPaid, totalApproved, totalClaimsPending: totalApproved - totalPaid, revenue, pendingRevenue: pending };
}

const WA_REMINDER_STAGES = [
  {
    stage: 1,
    label: "Due Soon",
    msg: (name: string, amount: number, month: string) =>
      `Hi ${name}, your DivergenCIE invoice of £${amount} for ${month} is due soon. Please arrange payment to avoid any disruption to classes.`,
  },
  {
    stage: 2,
    label: "Overdue — Deactivate in 3 Days",
    msg: (name: string, amount: number, month: string) =>
      `Hi ${name}, your invoice of £${amount} for ${month} is now overdue. Account will be deactivated in 3 days if not settled. Please contact us urgently.`,
  },
  {
    stage: 3,
    label: "Deactivated",
    msg: (name: string, amount: number, month: string) =>
      `Hi ${name}, your DivergenCIE account has been paused due to an outstanding invoice of £${amount} (${month}). Please settle to resume classes.`,
  },
  {
    stage: 4,
    label: "Receipt Acknowledged",
    msg: (name: string, amount: number, month: string) =>
      `Hi ${name}, we've received your payment of £${amount} for ${month}. Thank you — your account is active. See you in class!`,
  },
  {
    stage: 5,
    label: "Payment Plan",
    msg: (name: string, amount: number, month: string) =>
      `Hi ${name}, we've set up a payment plan for your outstanding balance of £${amount} (${month}). Please confirm the arrangement with the finance team.`,
  },
];

export async function advanceReminderStage(invoiceId: string) {
  await requireFinanceAccess();

  const inv = await prisma.studentInvoice.findUnique({
    where: { id: invoiceId },
    include: { student: true },
  });
  if (!inv) throw new Error("Invoice not found");
  const nextStage = Math.min(5, (inv.reminderStage ?? 0) + 1);
  await prisma.studentInvoice.update({ where: { id: invoiceId }, data: { reminderStage: nextStage } });
  revalidatePath("/portal/staff/finance/invoices");
  const stageData = WA_REMINDER_STAGES[nextStage - 1];
  return {
    stage: nextStage,
    label: stageData.label,
    waMessage: stageData.msg(
      inv.student?.name ?? "Student",
      inv.netAmount,
      inv.month
    ),
  };
}

export { WA_REMINDER_STAGES };

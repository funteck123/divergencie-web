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

  const all = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
    take: 500,
  });
  if (!query) return all;
  return all.filter(
    (inv: any) =>
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

  const inv = await prisma.invoice.create({
    data: { ...data, status: data.status ?? "due" },
  });
  revalidatePath("/portal/staff/finance/invoices");
  revalidatePath("/portal/parent/fees");
  return inv;
}

export async function updateInvoiceStatus(id: string, status: string) {
  await requireFinanceAccess();

  const inv = await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/portal/staff/finance/invoices");
  revalidatePath("/portal/parent/fees");
  return inv;
}

export async function getInvoiceStats() {
  await requireFinanceAccess();

  const invoices = await prisma.invoice.findMany({ take: 1000 });
  const total = invoices.reduce((s: number, i: any) => s + i.amount, 0);
  const collected = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.amount, 0);
  const overdue = invoices.filter((i: any) => i.status === "overdue").length;
  return { total, collected, pending: total - collected, overdue };
}

const _getRateCardsCached = unstable_cache(
  async () => prisma.rateCard.findMany({ orderBy: [{ course: "asc" }, { country: "asc" }] }),
  ["rate-cards"], { revalidate: 3600 }
);
export async function getRateCards() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return _getRateCardsCached();
}

export async function upsertRateCard(data: {
  course: string;
  country: string;
  groupCode: string;
  rateGBP: number;
}) {
  await requireFinanceAccess();

  const existing = await prisma.rateCard.findFirst({
    where: { course: data.course, country: data.country, groupCode: data.groupCode },
  });
  const card = existing
    ? await prisma.rateCard.update({ where: { id: existing.id }, data: { rateGBP: data.rateGBP } })
    : await prisma.rateCard.create({ data });
  revalidatePath("/portal/staff/finance/rates");
  return card;
}

export async function getParentInvoices(parentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const students = await prisma.user.findMany({
    where: { parentId },
    select: { id: true },
  });
  const ids = students.map((s: any) => s.id);
  return await prisma.invoice.findMany({
    where: { studentId: { in: ids } },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
}

export async function getClaimsForApproval() {
  await requireFinanceAccess();

  return await prisma.claim.findMany({
    where: { status: { in: ["pending", "submitted", "under_review"] } },
    include: { user: { select: { name: true, role: true, dept: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function approveClaim(id: string) {
  await requireFinanceAccess();

  const c = await prisma.claim.update({ where: { id }, data: { status: "approved" } });
  revalidatePath("/portal/management");
  revalidatePath("/portal/management/budget");
  revalidatePath("/portal/teacher/payment-claims");
  revalidatePath("/portal/staff/finance/claims");
  return c;
}

export async function rejectClaim(id: string) {
  await requireFinanceAccess();

  const c = await prisma.claim.update({ where: { id }, data: { status: "rejected" } });
  revalidatePath("/portal/management");
  revalidatePath("/portal/management/budget");
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
    prisma.invoice.findMany({ where: { issuedAt: { gte: cutoff } }, take: 1000 }),
  ]);
  const totalPaid = claims
    .filter((c: any) => c.status === "paid")
    .reduce((s: number, c: any) => s + c.amount, 0);
  const totalApproved = claims
    .filter((c: any) => c.status === "approved")
    .reduce((s: number, c: any) => s + c.amount, 0);
  const revenue = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.amount, 0);
  const pending = invoices
    .filter((i: any) => i.status !== "paid")
    .reduce((s: number, i: any) => s + i.amount, 0);
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

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new Error("Invoice not found");
  const nextStage = Math.min(5, ((inv as any).reminderStage ?? 0) + 1);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { reminderStage: nextStage } });
  revalidatePath("/portal/staff/finance/invoices");
  const stageData = WA_REMINDER_STAGES[nextStage - 1];
  return {
    stage: nextStage,
    label: stageData.label,
    waMessage: stageData.msg(
      (inv as any).student?.name ?? "Student",
      (inv as any).amount,
      (inv as any).month
    ),
  };
}

export { WA_REMINDER_STAGES };

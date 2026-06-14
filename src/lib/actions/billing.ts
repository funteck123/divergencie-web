"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function payInvoice(invoiceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const actor = session.user as any;
  if (actor.role !== "staff" && actor.role !== "management") throw new Error("Forbidden");

  const invoice = await prisma.studentInvoice.update({
    where: { id: invoiceId },
    data: { status: "paid" },
  });
  revalidatePath("/portal/parent/fees");
  revalidatePath("/portal/staff/finance/invoices");
  revalidatePath("/portal/management");
  return invoice;
}

export async function getStudentInvoices(studentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.studentInvoice.findMany({
    where: { studentId },
    include: {
      lineItems: true,
      billingMonth: true,
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
}

export async function submitManualPaymentReceipt(data: {
  invoiceId: string;
  receiptUrl: string;
  amount: number;
  currency: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const invoice = await prisma.studentInvoice.findUnique({
    where: { id: data.invoiceId },
  });
  if (!invoice) throw new Error("Invoice not found");

  const record = await prisma.paymentRecord.create({
    data: {
      entityType: "STUDENT_INVOICE",
      entityId: data.invoiceId,
      amount: data.amount,
      currency: data.currency,
      receiptLink: data.receiptUrl,
      status: "PENDING_VERIFICATION",
      paidAt: new Date(),
      receiverConfirmed: false,
      notes: data.notes || "Uploaded bank transfer receipt",
    },
  });

  await prisma.studentInvoice.update({
    where: { id: data.invoiceId },
    data: {
      status: "processing",
    },
  });

  await prisma.studentInvoiceStatusChangeLog.create({
    data: {
      invoiceId: data.invoiceId,
      fromStatus: invoice.status,
      toStatus: "processing",
      changedByUserId: session.user.id,
      reason: "Manual bank transfer receipt uploaded by student",
    },
  });

  revalidatePath("/portal/student/fees");
  revalidatePath("/portal/staff/finance/invoices");
  return record;
}

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
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
}

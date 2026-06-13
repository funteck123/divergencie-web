import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId, receiptUrl, notes } = await req.json();
    if (!invoiceId || !receiptUrl) {
      return NextResponse.json({ error: "Invoice ID and receipt URL are required" }, { status: 400 });
    }

    const invoice = await prisma.studentInvoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const user = session.user as any;
    const isSelf = user.id === invoice.studentId;
    let isParent = false;

    if (user.role?.toLowerCase() === "parent") {
      const student = await prisma.user.findUnique({
        where: { id: invoice.studentId },
        select: { parentId: true },
      });
      if (student?.parentId === user.id) {
        isParent = true;
      }
    }

    const isStaffOrManagement =
      user.role?.toLowerCase() === "staff" || user.role?.toLowerCase() === "management";

    if (!isSelf && !isParent && !isStaffOrManagement) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    // 1. Create a PaymentRecord with PENDING_VERIFICATION status
    const paymentRecord = await prisma.paymentRecord.create({
      data: {
        entityType: "STUDENT_INVOICE",
        entityId: invoiceId,
        amount: invoice.netAmount,
        currency: invoice.currency,
        receiptLink: receiptUrl,
        status: "PENDING_VERIFICATION",
        submittedAt: new Date(),
        paidByUserId: user.id,
        notes: notes || "Manual payment receipt uploaded",
      },
    });

    // 2. Update StudentInvoice status to "pending_verification" (or "pending")
    const updatedInvoice = await prisma.studentInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "pending_verification",
      },
    });

    // 3. Log status change in history
    await prisma.studentInvoiceStatusChangeLog.create({
      data: {
        invoiceId: invoice.id,
        fromStatus: invoice.status,
        toStatus: "pending_verification",
        changedByUserId: user.id,
        reason: "Manual payment receipt uploaded by parent/student",
      },
    });

    return NextResponse.json({
      message: "Receipt uploaded successfully and is pending verification",
      paymentRecord,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("[PAYMENTS_RECEIPT]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

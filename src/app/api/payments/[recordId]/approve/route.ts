import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/payments/[recordId]/approve — Finance approves manual receipt → PAID
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "finance")) {
    return NextResponse.json({ error: "Forbidden: Finance or Management required" }, { status: 403 });
  }

  const { recordId } = await params;
  const { notes } = await req.json().catch(() => ({}));

  const record = await prisma.paymentRecord.findUnique({ where: { id: recordId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (record.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: `Cannot approve: status is ${record.status}` }, { status: 400 });
  }

  // Update PaymentRecord → SUCCESSFUL
  const updatedRecord = await prisma.paymentRecord.update({
    where: { id: recordId },
    data: {
      status: "SUCCESSFUL",
      paidAt: new Date(),
      receiverConfirmed: true,
      confirmedAt: new Date(),
      confirmedByUserId: user.id,
      notes: notes ?? record.notes,
    },
  });

  // Update linked invoice → paid
  if (record.entityType === "STUDENT_INVOICE" && record.entityId) {
    const invoice = await prisma.studentInvoice.findUnique({ where: { id: record.entityId } });
    if (invoice) {
      await prisma.studentInvoice.update({
        where: { id: record.entityId },
        data: { status: "paid", paymentDone: true, paymentDate: new Date() },
      });

      await prisma.studentInvoiceStatusChangeLog.create({
        data: {
          invoiceId: record.entityId,
          fromStatus: invoice.status,
          toStatus: "paid",
          changedByUserId: user.id,
          reason: "Manual receipt approved by Finance",
        },
      });

      // LedgerEntry
      let bankAccount = await prisma.bankAccount.findFirst({ where: { isDcAccount: true, isActive: true } });
      if (!bankAccount) {
        bankAccount = await prisma.bankAccount.create({
          data: { label: "DC Operating Account", isDcAccount: true, currency: invoice.currency || "GBP", currentBalance: 0, isActive: true },
        });
      }

      await prisma.ledgerEntry.create({
        data: {
          bankAccountId: bankAccount.id,
          amount: record.amount,
          direction: "credit",
          purpose: "revenue",
          studentInvoiceId: record.entityId,
        },
      });

      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: { currentBalance: { increment: record.amount } },
      });
    }
  }

  return NextResponse.json(updatedRecord);
}

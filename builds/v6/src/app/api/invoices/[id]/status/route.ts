import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/invoices/[id]/status — Finance changes invoice status (draft→issued, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  const isFinance = role === "staff" && dept === "finance";
  const isManagement = role === "management";

  if (!isFinance && !isManagement) {
    return NextResponse.json({ error: "Forbidden: Finance or Management required" }, { status: 403 });
  }

  const { id } = await params;
  const { status, reason } = await req.json();

  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  const existing = await prisma.studentInvoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = { status };
  if (status === "issued") updateData.issuedAt = new Date();
  if (status === "paid") { updateData.paymentDone = true; updateData.paymentDate = new Date(); }

  const updated = await prisma.studentInvoice.update({ where: { id }, data: updateData });

  await prisma.studentInvoiceStatusChangeLog.create({
    data: {
      invoiceId: id,
      fromStatus: existing.status,
      toStatus: status,
      changedByUserId: user.id,
      reason: reason ?? "Status updated",
    },
  });

  return NextResponse.json(updated);
}

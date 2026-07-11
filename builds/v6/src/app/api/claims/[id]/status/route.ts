import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/claims/[id]/status — Finance approves, Management final-approves
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "finance")) {
    return NextResponse.json({ error: "Forbidden: Finance or Management required" }, { status: 403 });
  }

  const { id } = await params;
  const { status, reason } = await req.json();
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  const existing = await prisma.claim.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.claim.update({ where: { id }, data: { status } });

  await prisma.claimStatusChangeLog.create({
    data: {
      claimId: id,
      fromStatus: existing.status,
      toStatus: status,
      changedByUserId: user.id,
      reason: reason ?? "Status updated",
    },
  });

  // Auto-create Paycheck on "approved"
  if (status === "approved") {
    const paycheck = await prisma.paycheck.create({
      data: {
        claimId: id,
        recipientId: existing.userId,
        month: existing.month,
        netAmount: existing.amount,
        dueAmount: existing.amount,
        currency: existing.currency,
        status: "draft",
      },
    });

    await prisma.paycheckStatusChangeLog.create({
      data: {
        paycheckId: paycheck.id,
        fromStatus: "none",
        toStatus: "draft",
        changedByUserId: user.id,
        reason: "Auto-generated from approved claim",
      },
    });
  }

  return NextResponse.json(updated);
}

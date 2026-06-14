import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/enrolments/student/item/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "pr")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;
  const { status, notes, endDate } = await req.json();
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  const existing = await prisma.studentEnrolmentItem.findUnique({ where: { id: itemId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.studentEnrolmentItem.update({
    where: { id: itemId },
    data: {
      status,
      isActive: status === "ACTIVE",
      endDate: endDate ? new Date(endDate) : existing.endDate,
      ...(status === "CANCELLED" && { cancelledAt: new Date(), cancellationReason: notes }),
    },
  });

  await prisma.studentEnrolmentItemStatusChangeLog.create({
    data: {
      enrolmentItemId: itemId,
      fromStatus: existing.status,
      toStatus: status,
      changedByUserId: user.id,
      reason: notes ?? "Status updated",
    },
  });

  return NextResponse.json(updated);
}

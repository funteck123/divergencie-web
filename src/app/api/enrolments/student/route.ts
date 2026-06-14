import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/enrolments/student — create enrolment item (PR/Ops)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "pr")) {
    return NextResponse.json({ error: "Forbidden: PR/Ops or Management required" }, { status: 403 });
  }

  const { studentId, serviceId, serviceType, startDate, notes } = await req.json();
  if (!studentId || !serviceId) {
    return NextResponse.json({ error: "studentId and serviceId required" }, { status: 400 });
  }

  // Find or create enrolment list
  let list = await prisma.studentEnrolmentList.findFirst({ where: { studentId } });
  if (!list) {
    list = await prisma.studentEnrolmentList.create({
      data: { studentId, serviceType: serviceType ?? "REGULAR", isActive: true },
    });
  }

  const item = await prisma.studentEnrolmentItem.create({
    data: {
      enrolmentListId: list.id,
      studentId,
      serviceId,
      startDate: startDate ? new Date(startDate) : new Date(),
      status: "ACTIVE",
      isActive: true,
    },
  });

  await prisma.studentEnrolmentItemStatusHistory.create({
    data: {
      enrolmentItemId: item.id,
      fromStatus: "NONE",
      toStatus: "ACTIVE",
      changedByUserId: user.id,
      reason: notes ?? "Initial enrolment",
    },
  });

  return NextResponse.json(item, { status: 201 });
}

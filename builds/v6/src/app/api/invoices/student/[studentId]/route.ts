import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await params;
  const user = session.user as any;
  const role = user.role?.toLowerCase();

  const isSelf = user.id === studentId;
  const isStaffOrManagement = role === "management" || role === "staff";

  // Check parent relationship
  let isParent = false;
  if (role === "parent") {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { parentId: true },
    });
    if (student && student.parentId === user.id) {
      isParent = true;
    }
  }

  if (!isSelf && !isParent && !isStaffOrManagement) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const invoices = await prisma.studentInvoice.findMany({
      where: { studentId },
      include: {
        lineItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("[INVOICES_GET_BY_STUDENT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

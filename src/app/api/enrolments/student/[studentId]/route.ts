import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/enrolments/student/[studentId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await params;
  const user = session.user as any;
  const role = user.role?.toLowerCase();

  if (role === "student" && user.id !== studentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (role === "parent") {
    const child = await prisma.user.findUnique({ where: { id: studentId }, select: { parentId: true } });
    if (child?.parentId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrolmentList = await prisma.studentEnrolmentList.findFirst({
    where: { studentId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          service: true,
          history: { orderBy: { changedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return NextResponse.json(enrolmentList ?? { studentId, items: [] });
}

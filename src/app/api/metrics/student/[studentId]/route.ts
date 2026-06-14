import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/metrics/student/[studentId] — attendance %, mastery avg
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

  const [totalAttendance, presentAttendance, progressItems, totalSyllabusItems] = await Promise.all([
    prisma.sessionAttendance.count({ where: { studentId } }),
    prisma.sessionAttendance.count({ where: { studentId, status: "PRESENT" } }),
    prisma.studentProgress.findMany({ where: { studentId } }),
    prisma.syllabusItem.count(),
  ]);

  const attendancePct = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
  const completedItems = progressItems.filter((p: any) => p.completed).length;
  const masteryPct = totalSyllabusItems > 0 ? Math.round((completedItems / totalSyllabusItems) * 100) : 0;

  const avgMastery = progressItems.length > 0
    ? Math.round(progressItems.reduce((sum: number, p: any) => sum + (p.masteryLevel ?? 0), 0) / progressItems.length)
    : 0;

  return NextResponse.json({ attendancePct, masteryPct, avgMastery, completedItems, totalSyllabusItems, totalAttendance, presentAttendance });
}

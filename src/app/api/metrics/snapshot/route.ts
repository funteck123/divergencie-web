import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/metrics/snapshot — Management: latest MetricSnapshot + live aggregates
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role?.toLowerCase() !== "management" && user.role?.toLowerCase() !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalStudents,
    activeStudents,
    totalTeachers,
    openTickets,
    pendingInvoices,
    recentSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "student", active: true } }),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.studentInvoice.count({ where: { status: { in: ["issued", "pending_verification"] } } }),
    prisma.academicSession.count({
      where: { startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const latestSnapshot = null;

  return NextResponse.json({
    live: { totalStudents, activeStudents, totalTeachers, openTickets, pendingInvoices, recentSessions },
    snapshot: latestSnapshot,
  });
}

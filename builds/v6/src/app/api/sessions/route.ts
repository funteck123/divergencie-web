import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/sessions — list sessions role-filtered
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const serviceId = searchParams.get("serviceId");

  let where: any = {};

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.startTime = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }
  if (serviceId) where.serviceId = serviceId;

  if (role === "student") {
    where.OR = [{ studentId: user.id }, { group: { students: { some: { id: user.id } } } }];
  } else if (role === "teacher") {
    where.teacherId = user.id;
  } else if (role === "parent") {
    const child = await prisma.user.findFirst({ where: { parentId: user.id }, select: { id: true } });
    if (!child) return NextResponse.json([]);
    where.OR = [{ studentId: child.id }, { group: { students: { some: { id: child.id } } } }];
  } else if (role !== "staff" && role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await prisma.academicSession.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      group: { select: { id: true, code: true } },
      service: { select: { id: true, subjectName: true } },
    },
    orderBy: { startTime: "asc" },
    take: 200,
  });

  return NextResponse.json(sessions);
}

// POST /api/sessions — create academic session (PR/Ops)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "pr")) {
    return NextResponse.json({ error: "Forbidden: PR/Ops or Management required" }, { status: 403 });
  }

  const { teacherId, studentId, groupId, serviceId, startTime, endTime, subject, isTrial, durationHours } = await req.json();
  if (!teacherId || !startTime || !endTime) {
    return NextResponse.json({ error: "teacherId, startTime, endTime required" }, { status: 400 });
  }

  const created = await prisma.academicSession.create({
    data: {
      teacherId,
      studentId: studentId ?? null,
      groupId: groupId ?? null,
      serviceId: serviceId ?? null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      subject: subject ?? null,
      isTrial: isTrial ?? false,
      durationHours: durationHours ?? 1,
      status: "SCHEDULED",
    },
  });

  return NextResponse.json(created, { status: 201 });
}

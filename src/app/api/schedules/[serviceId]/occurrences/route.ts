import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/schedules/[serviceId]/occurrences
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "pr")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { serviceId } = await params;
  const { dayOfWeek, startTime, endTime, recurrenceType, durationHours, sessionTypeId } = await req.json();

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime, endTime required" }, { status: 400 });
  }

  // Resolve session type — caller can pass sessionTypeId or we find default REGULAR
  let resolvedSessionTypeId = sessionTypeId;
  if (!resolvedSessionTypeId) {
    const defaultType = await prisma.sessionType.findFirst({ where: { name: "REGULAR" } });
    if (!defaultType) return NextResponse.json({ error: "No SessionType seeded. Seed lookup tables first." }, { status: 500 });
    resolvedSessionTypeId = defaultType.id;
  }

  const schedule = await prisma.serviceSchedule.upsert({
    where: { serviceId },
    update: {},
    create: { serviceId },
  });

  const occurrence = await prisma.scheduleOccurrence.create({
    data: {
      scheduleId: schedule.id,
      sessionTypeId: resolvedSessionTypeId,
      dayOfWeek: dayOfWeek ?? null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationHours: durationHours ?? 1,
      recurrenceType: recurrenceType ?? "WEEKLY",
      status: "ACTIVE",
      isActive: true,
    },
  });

  await prisma.scheduleOccurrenceStatusHistory.create({
    data: {
      occurrenceId: occurrence.id,
      fromStatus: "NONE",
      toStatus: "ACTIVE",
      changedByUserId: user.id,
    },
  });

  return NextResponse.json(occurrence, { status: 201 });
}

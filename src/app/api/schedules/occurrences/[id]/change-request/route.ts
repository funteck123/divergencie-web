import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/schedules/occurrences/[id]/change-request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id: occurrenceId } = await params;

  const occurrence = await prisma.scheduleOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { schedule: true },
  });
  if (!occurrence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { requestType, reason, proposedStartTime, proposedEndTime, proposedDayOfWeek, proposedDuration } = await req.json();
  if (!requestType || !reason) return NextResponse.json({ error: "requestType and reason required" }, { status: 400 });

  const changeRequest = await prisma.scheduleChangeRequest.create({
    data: {
      scheduleId: occurrence.scheduleId,
      occurrenceId,
      requestedByUserId: user.id,
      requestType,
      recurrenceType: occurrence.recurrenceType,
      proposedStartTime: proposedStartTime ? new Date(proposedStartTime) : null,
      proposedEndTime: proposedEndTime ? new Date(proposedEndTime) : null,
      proposedDayOfWeek: proposedDayOfWeek ?? null,
      proposedDuration: proposedDuration ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json(changeRequest, { status: 201 });
}

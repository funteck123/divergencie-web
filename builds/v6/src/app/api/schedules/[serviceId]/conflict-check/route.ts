import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectScheduleConflict } from "@/lib/conflict";

// POST /api/schedules/[serviceId]/conflict-check — check for schedule conflicts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serviceId } = await params;
  const { dayOfWeek, startTime, endTime, recurrenceType, oneOffDate, excludeOccurrenceId } = await req.json().catch(() => ({}));

  if (!startTime || !endTime || !recurrenceType) {
    return NextResponse.json({ error: "Missing required fields (startTime, endTime, recurrenceType)" }, { status: 400 });
  }

  try {
    const conflicts = await detectScheduleConflict(serviceId, {
      dayOfWeek,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      recurrenceType,
      oneOffDate: oneOffDate ? new Date(oneOffDate) : null,
      excludeOccurrenceId
    });

    return NextResponse.json({
      conflict: conflicts.length > 0,
      conflicts
    });
  } catch (error: any) {
    console.error("Conflict check error:", error);
    return NextResponse.json({ error: error.message || "Failed to perform conflict check" }, { status: 500 });
  }
}

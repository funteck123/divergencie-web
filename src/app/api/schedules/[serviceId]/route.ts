import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/schedules/[serviceId] — get schedule + occurrences
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serviceId } = await params;

  const schedule = await prisma.serviceSchedule.findFirst({
    where: { serviceId },
    include: {
      occurrences: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  return NextResponse.json(schedule ?? { serviceId, occurrences: [] });
}

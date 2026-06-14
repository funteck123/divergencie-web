import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/calendar — retrieve current user's calendar items
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const where: any = {
    userId: user.id,
  };

  if (startParam || endParam) {
    where.startTime = {};
    if (startParam) {
      where.startTime.gte = new Date(startParam);
    }
    if (endParam) {
      where.startTime.lte = new Date(endParam);
    }
  }

  try {
    const items = await prisma.calendarItem.findMany({
      where,
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/calendar/[id] can trigger GCal sync toggle or update
export async function PATCH(req: NextRequest) {
  // Let's implement an endpoint to toggle addedToGCal
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, addedToGCal } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing calendar item ID" }, { status: 400 });
    }

    const item = await prisma.calendarItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: "Calendar item not found" }, { status: 404 });
    }

    if (item.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.calendarItem.update({
      where: { id },
      data: {
        addedToGCal,
        gCalSyncedAt: addedToGCal ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

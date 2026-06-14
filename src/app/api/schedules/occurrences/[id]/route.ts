import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/schedules/occurrences/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  if (role !== "management" && !(role === "staff" && dept === "pr")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, notes } = await req.json();

  const existing = await prisma.scheduleOccurrence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.scheduleOccurrence.update({
    where: { id },
    data: {
      ...(status && {
        status,
        isActive: status === "ACTIVE",
        ...(status === "PAUSED" && { pausedAt: new Date() }),
        ...(status === "INACTIVE" && { deactivatedAt: new Date() }),
      }),
    },
  });

  if (status && status !== existing.status) {
    await prisma.scheduleOccurrenceStatusHistory.create({
      data: {
        occurrenceId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedByUserId: user.id,
        reason: notes ?? "Status updated",
      },
    });
  }

  return NextResponse.json(updated);
}

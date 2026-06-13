import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string; syllabusItemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, syllabusItemId } = await params;

  try {
    const { completed, masteryPct } = await req.json();

    const progress = await prisma.studentProgress.upsert({
      where: {
        studentId_syllabusItemId: { studentId, syllabusItemId }
      },
      update: {
        ...(completed !== undefined ? { completed } : {}),
        ...(masteryPct !== undefined ? { masteryPct } : {}),
      },
      create: {
        studentId,
        syllabusItemId,
        completed: completed ?? false,
        masteryPct: masteryPct ?? 0,
      },
    });

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("[PROGRESS_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

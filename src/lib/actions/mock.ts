"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function saveMockResult(data: {
  subject: string;
  level: string;
  diff: string;
  score: number;
  grade: string;
  timeTaken: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not logged in" };

  try {
    const result = await prisma.mockResult.create({
      data: { studentId: session.user.id, ...data },
    });

    // Update StudentProgress using the new @@unique([studentId, syllabusItemId]) constraint
    const syllabusItem = await prisma.syllabusItem.findFirst({
      where: { subject: data.subject },
    });

    if (syllabusItem) {
      await prisma.studentProgress.upsert({
        where: {
          // Now we can use the proper compound unique key
          studentId_syllabusItemId: {
            studentId: session.user.id,
            syllabusItemId: syllabusItem.id,
          },
        },
        create: {
          studentId: session.user.id,
          syllabusItemId: syllabusItem.id,
          masteryPct: data.score,
          completed: data.score >= 80,
        },
        update: {
          masteryPct: data.score,
          completed: data.score >= 80,
        },
      });
    }

    return { success: true, id: result.id };
  } catch (err: any) {
    console.error("Mock Save Error:", err);
    return { success: false, error: err.message };
  }
}

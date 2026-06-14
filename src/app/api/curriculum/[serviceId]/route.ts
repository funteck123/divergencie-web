import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/curriculum/[serviceId] — full curriculum tree for a service
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serviceId } = await params;

  const curriculum = await prisma.curriculumList.findFirst({
    where: { serviceId },
    include: {
      syllabusLists: {
        where: { isActive: true },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            include: {
              items: { orderBy: { order: "asc" } },
            },
          },
          taskLists: {
            where: { isActive: true },
            include: { items: true },
          },
          mockLists: {
            where: { isActive: true },
            include: { items: true },
          },
        },
      },
    },
  });

  return NextResponse.json(curriculum ?? { serviceId, syllabusLists: [] });
}

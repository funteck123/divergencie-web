import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH /api/curriculum/doubts/[id] — Teacher answers doubt
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();

  if (role !== "teacher" && role !== "staff" && role !== "management") {
    return NextResponse.json({ error: "Forbidden: Teachers only" }, { status: 403 });
  }

  const { id } = await params;
  const { answer } = await req.json();

  if (!answer) return NextResponse.json({ error: "answer required" }, { status: 400 });

  const doubt = await prisma.doubt.findUnique({
    where: { id },
    include: {
      syllabusItem: {
        include: {
          syllabusList: {
            include: {
              curriculumList: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!doubt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role === "teacher" && doubt.syllabusItem?.syllabusList?.curriculumList?.service?.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden: Not your doubt" }, { status: 403 });
  }

  const updated = await prisma.doubt.update({
    where: { id },
    data: { response: answer, status: "answered" },
  });

  return NextResponse.json(updated);
}

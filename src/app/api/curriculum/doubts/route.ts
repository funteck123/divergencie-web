import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/curriculum/doubts — Teacher: unanswered; Student: own doubts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const { searchParams } = new URL(req.url);
  const answered = searchParams.get("answered");

  let where: any = {};

  if (role === "student") {
    where.studentId = user.id;
  } else if (role === "teacher") {
    where.syllabusItem = {
      syllabusList: {
        curriculumList: {
          service: {
            teacherId: user.id,
          },
        },
      },
    };
    if (answered === "false") where.response = null;
  } else if (role === "staff" || role === "management") {
    if (answered === "false") where.response = null;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doubts = await prisma.doubt.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      syllabusItem: {
        select: {
          id: true,
          topicTitle: true,
          syllabusList: {
            select: {
              curriculumList: {
                select: {
                  service: {
                    select: {
                      teacherId: true,
                      teacher: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    take: 100,
  });

  return NextResponse.json(doubts);
}

// POST /api/curriculum/doubts — Student raises doubt
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role?.toLowerCase() !== "student") {
    return NextResponse.json({ error: "Forbidden: Students only" }, { status: 403 });
  }

  const { syllabusItemId, question } = await req.json();

  if (!syllabusItemId || !question) {
    return NextResponse.json({ error: "syllabusItemId and question required" }, { status: 400 });
  }

  const doubt = await prisma.doubt.create({
    data: {
      studentId: user.id,
      syllabusItemId,
      body: question,
      status: "open",
    },
  });

  return NextResponse.json(doubt, { status: 201 });
}

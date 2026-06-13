import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/sessions/[id]/attendance - Get attendance record for a session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const attendance = await prisma.sessionAttendance.findFirst({
      where: { sessionId },
      include: {
        student: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("[ATTENDANCE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/sessions/[id]/attendance - Log attendance for a session (Teacher/Staff/Management only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const user = session.user as any;
  const role = user.role?.toLowerCase();

  if (role !== "teacher" && role !== "staff" && role !== "management") {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const sessionRecord = await prisma.academicSession.findUnique({
      where: { id: sessionId }
    });

    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Teachers can only log attendance for their own assigned sessions
    if (role === "teacher" && sessionRecord.teacherId !== user.id) {
      return NextResponse.json({
        error: "Forbidden: You are not the instructor for this session"
      }, { status: 403 });
    }

    const { status, teacherLoggedHours, notes, feedbackStars, feedbackText } = await req.json();

    const normalizedStatus = (status || "PRESENT").toUpperCase();
    const finalHours = teacherLoggedHours !== undefined ? teacherLoggedHours : sessionRecord.durationHours;

    const attendance = await prisma.sessionAttendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: sessionRecord.studentId
        }
      },
      update: {
        status: normalizedStatus,
        teacherLoggedHours: finalHours,
        notes,
        feedbackStars,
        feedbackText,
        markedAt: new Date()
      },
      create: {
        sessionId,
        studentId: sessionRecord.studentId,
        status: normalizedStatus,
        teacherLoggedHours: finalHours,
        notes,
        feedbackStars,
        feedbackText,
        markedAt: new Date()
      }
    });

    // Update the AcademicSession status to completed or missed
    await prisma.academicSession.update({
      where: { id: sessionId },
      data: {
        status: normalizedStatus === "PRESENT" ? "COMPLETED" : "MISSED"
      }
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("[ATTENDANCE_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

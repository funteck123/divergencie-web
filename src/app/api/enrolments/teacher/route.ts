import { NextRequest, NextResponse } from "next/server";
import { createTeacherEnrolment } from "@/lib/actions/teacherEnrolments";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await createTeacherEnrolment(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create teacher enrolment" },
      { status: error.message === "Unauthorized" ? 401 : error.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}

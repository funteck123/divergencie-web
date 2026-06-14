import { NextRequest, NextResponse } from "next/server";
import { createTeacherEnrolment, getTeacherEnrolments } from "@/lib/actions/teacherEnrolments";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailOrId = searchParams.get("teacherId") || searchParams.get("email") || "";
    if (!emailOrId) return NextResponse.json({ error: "teacherId or email required" }, { status: 400 });
    const data = await getTeacherEnrolments(emailOrId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch teacher enrolments" },
      { status: error.message === "Unauthorized" ? 401 : error.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}

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

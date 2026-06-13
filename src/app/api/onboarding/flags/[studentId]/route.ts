import { NextRequest, NextResponse } from "next/server";
import { updateOnboardingFlags } from "@/lib/actions/onboarding";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;

  try {
    const body = await req.json();
    const result = await updateOnboardingFlags(studentId, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ONBOARDING_PATCH]", error);
    const status = error.message.includes("Forbidden")
      ? 403
      : error.message.includes("Unauthorized")
      ? 401
      : error.message.includes("not found")
      ? 404
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

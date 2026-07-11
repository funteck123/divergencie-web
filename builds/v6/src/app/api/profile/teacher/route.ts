import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const email = searchParams.get("email") || "";

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email },
      include: { teacherProfile: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const actor = session.user as any;
    if (actor.role !== "management" && actor.role !== "staff" && actor.id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(user.teacherProfile ?? {});
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { userId, firstName, lastName, teachingProfileUrl } = body;

    const actor = session.user as any;
    if (actor.id !== userId && actor.role !== "management" && actor.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.teacherProfile.upsert({
      where: { userId },
      create: { userId, firstName, lastName, teachingProfileUrl },
      update: { firstName, lastName, teachingProfileUrl },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const subGroup = session.user.subGroup;

  // Only Management or HODs (subGroup === 'supervisor') can delete
  if (role !== "management" && subGroup !== "supervisor") {
    return NextResponse.json({ error: "Forbidden: Only supervisors can remove categories" }, { status: 403 });
  }

  try {
    await prisma.ticketCategory.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "management" && role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permissions = await prisma.ticketPermission.findMany({
    orderBy: { department: 'asc' }
  });
  return NextResponse.json(permissions);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, data } = await req.json();
    const updated = await prisma.ticketPermission.update({
      where: { id },
      data
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

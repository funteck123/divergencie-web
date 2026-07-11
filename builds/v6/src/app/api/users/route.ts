import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/users - User lookup with filtering
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "staff" && role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const dept = searchParams.get("dept");
  const userRole = searchParams.get("role");

  try {
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true, dept: true, subGroup: true, supervisor: true },
      });
      return NextResponse.json(user);
    }

    const where: any = {};
    if (dept) where.dept = dept;
    if (userRole) where.role = userRole;

    const users = await prisma.user.findMany({
      where,
      take: 200,
      select: { id: true, name: true, email: true, role: true, dept: true, subGroup: true, supervisor: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

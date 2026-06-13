import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { isActive: true, status: "OPEN" },
      select: { id: true, role: true, dept: true, description: true },
      orderBy: { role: "asc" },
    });
    return NextResponse.json(jobs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

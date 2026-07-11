import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { isActive: true, status: "OPEN" },
      include: { staffRole: true, dept: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(
      jobs.map(j => ({
        id: j.id,
        role: j.staffRole?.name ?? null,
        dept: j.dept?.name ?? null,
        description: j.description,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      id: true,
      subjectName: true,
      fullSubjectName: true,
      board: true,
      courseLevel: true,
      serviceType: true,
      currency: true,
      standardRate: true,
    },
    orderBy: [{ board: "asc" }, { subjectName: "asc" }],
    take: 200,
  });

  // Group by serviceType for brochure display
  const grouped: Record<string, { subjects: string[]; board: string; courseLevel: string }[]> = {};
  for (const svc of services) {
    const key = svc.serviceType ?? "Other";
    if (!grouped[key]) grouped[key] = [];
    const existing = grouped[key].find(g => g.board === (svc.board ?? "") && g.courseLevel === (svc.courseLevel ?? ""));
    if (existing) {
      if (!existing.subjects.includes(svc.subjectName)) existing.subjects.push(svc.subjectName);
    } else {
      grouped[key].push({
        board: svc.board ?? "",
        courseLevel: svc.courseLevel ?? "",
        subjects: [svc.subjectName],
      });
    }
  }

  return NextResponse.json({ groups: grouped, total: services.length });
}

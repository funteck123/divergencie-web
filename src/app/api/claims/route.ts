import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/claims — role-filtered
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  let where: any = {};

  if (role === "teacher" || role === "ambassador") {
    where.userId = user.id;
  } else if (role === "staff") {
    if (dept !== "finance") where.userId = user.id;
    // finance sees all
  } else if (role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claims = await prisma.claim.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, role: true, dept: true } },
      history: { orderBy: { changedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(claims);
}

// POST /api/claims — submit claim
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role = user.role?.toLowerCase();

  if (!["teacher", "staff", "management"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { month, sessions: sessionCount, hours, rateApplied, notes, dept } = await req.json();
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const amount = (hours ?? 1) * (rateApplied ?? 0);
  const resolvedDept = dept ?? user.dept ?? "PR";

  const claim = await prisma.claim.create({
    data: {
      userId: user.id,
      month,
      sessions: sessionCount ?? null,
      hours: hours ?? null,
      rateApplied: rateApplied ?? null,
      amount,
      dept: resolvedDept,
      currency: "GBP",
      status: "pending",
      notes,
      claimantType: role,
    },
  });

  await prisma.claimStatusChangeLog.create({
    data: {
      claimId: claim.id,
      fromStatus: "draft",
      toStatus: "pending",
      changedByUserId: user.id,
      reason: notes ?? "Claim submitted",
    },
  });

  return NextResponse.json(claim, { status: 201 });
}

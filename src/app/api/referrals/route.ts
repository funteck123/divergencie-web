import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const referral = await prisma.referral.findFirst({
    where: { code, isActive: true },
    include: { referrer: { select: { name: true, referralCode: true } } },
  });

  if (!referral) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

  // Track click
  await prisma.referralClick.create({
    data: {
      referralId: referral.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  return NextResponse.json({ referral });
}

export async function PATCH(req: NextRequest) {
  const { referralId, convertedToEnquiry, convertedToEnrolment } = await req.json();
  if (!referralId) return NextResponse.json({ error: "Missing referralId" }, { status: 400 });

  // Find latest click for this referral and mark converted
  const latest = await prisma.referralClick.findFirst({
    where: { referralId },
    orderBy: { clickedAt: "desc" },
  });

  if (!latest) return NextResponse.json({ error: "No click found" }, { status: 404 });

  await prisma.referralClick.update({
    where: { id: latest.id },
    data: {
      convertedToEnquiry: convertedToEnquiry ?? latest.convertedToEnquiry,
      convertedToEnrolment: convertedToEnrolment ?? latest.convertedToEnrolment,
    },
  });

  return NextResponse.json({ ok: true });
}

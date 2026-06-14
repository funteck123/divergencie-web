import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, country, message, referralCode } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    const studentUserType = await prisma.userType.findFirst({ where: { name: "Student" } });

    let form = await prisma.registrationForm.findFirst({
      where: { name: "Student Admissions", isActive: true },
    });

    if (!form) {
      form = await prisma.registrationForm.create({
        data: {
          name: "Student Admissions",
          targetUserTypeId: studentUserType?.id ?? null,
          description: "Public student admissions form",
          isPublic: true,
          isActive: true,
        },
      });
    }

    await prisma.registrationFormEntry.create({
      data: {
        formId: form.id,
        name,
        email,
        phone: phone ?? null,
        country: country ?? null,
        message: message ?? null,
        additionalData: referralCode ? JSON.stringify({ referralCode }) : null,
        status: "PENDING",
      },
    });

    // Also create a Lead record for the marketing/PR team
    await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        source: referralCode ? `referral:${referralCode}` : "admissions_form",
        notes: [country ? `Country: ${country}` : null, message].filter(Boolean).join(" | ") || null,
        passedToPR: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to submit" }, { status: 500 });
  }
}

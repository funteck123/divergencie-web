import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, country, role, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    // Look up the UserType for Staff to wire targetUserTypeId
    const staffUserType = await prisma.userType.findFirst({ where: { name: "Staff" } });

    let form = await prisma.registrationForm.findFirst({
      where: { targetUserTypeId: staffUserType?.id, isPublic: true, isActive: true },
    });

    if (!form) {
      form = await prisma.registrationForm.create({
        data: {
          name: "Careers Application",
          targetUserTypeId: staffUserType?.id ?? null,
          description: "Staff application form",
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
        additionalData: JSON.stringify({ roleApplied: role }),
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}

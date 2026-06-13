import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  const dept = user.dept?.toLowerCase();

  // Allow Finance dept staff and Management users
  if (role !== "management" && (role !== "staff" || dept !== "finance")) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const { month, studentId } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid or missing month format. Expected YYYY-MM" },
        { status: 400 }
      );
    }

    // 1. Create or find the InvoiceMonth record
    const invoiceMonth = await prisma.invoiceMonth.upsert({
      where: { month },
      update: {},
      create: { month },
    });

    // Parse billing month start and end dates
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10) - 1; // 0-indexed JS Month
    const startDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum + 1, 1, 0, 0, 0, 0));

    // 2. Fetch active enrolment lists
    const enrolmentLists = await prisma.studentEnrolmentList.findMany({
      where: {
        isActive: true,
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: true,
        items: {
          where: {
            isActive: true,
          },
          include: {
            service: true,
          },
        },
      },
    });

    if (enrolmentLists.length === 0) {
      return NextResponse.json({ message: "No active student enrolments found" }, { status: 200 });
    }

    const generatedInvoices = [];

    for (const list of enrolmentLists) {
      const student = list.student;

      // Delete existing draft invoice for this month to avoid duplicates
      await prisma.studentInvoice.deleteMany({
        where: {
          studentId: student.id,
          month,
          status: "draft",
        },
      });

      // Find all groups the student belongs to
      const studentGroups = await prisma.group.findMany({
        where: {
          students: {
            some: { id: student.id },
          },
        },
        select: { id: true },
      });
      const groupIds = studentGroups.map((g) => g.id);

      // Find all completed/attended sessions for the student in this month
      const sessions = await prisma.academicSession.findMany({
        where: {
          startTime: {
            gte: startDate,
            lt: endDate,
          },
          OR: [
            { studentId: student.id },
            { groupId: { in: groupIds } },
          ],
        },
        include: {
          teacher: true,
          attendances: {
            where: { studentId: student.id },
          },
        },
      });

      const lineItemsData: any[] = [];
      let subtotal = 0;

      // Process sessions into line items
      for (const session of sessions) {
        const attendance = session.attendances[0];
        // Only bill if attendance is marked and status is PRESENT or similar, and not disputed
        if (!attendance) continue;
        if (attendance.status?.toUpperCase() !== "PRESENT") continue;
        if (attendance.hoursMatchStatus === "DISPUTED") continue;

        // Retrieve service
        let service = null;
        if (session.serviceId) {
          service = await prisma.service.findUnique({ where: { id: session.serviceId } });
        }

        const country = student.country || "UK";
        let groupCode = "B";

        if (session.groupId) {
          const grp = await prisma.group.findUnique({ where: { id: session.groupId } });
          if (grp?.code?.includes("C") || grp?.groupCategory?.includes("C")) groupCode = "C";
          else if (grp?.code?.includes("T") || grp?.groupCategory?.includes("T")) groupCode = "T";
        } else {
          groupCode = "C"; // default to 1-on-1 rate
        }

        // Determine rate
        let rate = service?.standardRate || 150.0;
        const rateCard = await prisma.rateCard.findFirst({
          where: {
            country: { equals: country, mode: "insensitive" },
            groupCode: { equals: groupCode, mode: "insensitive" },
          },
        });
        if (rateCard) {
          rate = rateCard.rateGBP;
        }

        const hours = attendance.teacherLoggedHours || session.durationHours || 1.0;
        const lineTotal = hours * rate;
        subtotal += lineTotal;

        // Find the matching enrolment item if possible
        const enrolmentItem = list.items.find((item) => item.serviceId === session.serviceId);

        lineItemsData.push({
          lineType: session.isTrial ? "trial_tuition" : "batch_tuition",
          enrolmentItemId: enrolmentItem?.id || null,
          sessionId: session.id,
          sessionDate: session.startTime,
          sessionStart: session.startTime,
          sessionEnd: session.endTime,
          attendanceStatusSnapshot: attendance.status,
          isTrialSession: session.isTrial,
          sessionHours: hours,
          rateSnapshot: rate,
          groupCodeSnapshot: groupCode,
          teacherNameSnapshot: session.teacher?.name || "Teacher",
          serviceNameSnapshot: session.subject || service?.subjectName || "Coaching Session",
          currency: "GBP",
          hoursOrQty: hours,
          lineTotal,
        });
      }

      // If no session-based line items, check if they have a monthly subscription service
      if (lineItemsData.length === 0) {
        const monthlyEnrolments = list.items.filter((item) => item.service?.serviceType === "MONTHLY");
        for (const item of monthlyEnrolments) {
          const country = student.country || "UK";
          let rate = item.service.standardRate || 150.0;
          const rateCard = await prisma.rateCard.findFirst({
            where: {
              country: { equals: country, mode: "insensitive" },
              groupCode: "B",
            },
          });
          if (rateCard) {
            rate = rateCard.rateGBP;
          }

          subtotal += rate;
          lineItemsData.push({
            lineType: "monthly_tuition",
            enrolmentItemId: item.id,
            rateSnapshot: rate,
            serviceNameSnapshot: item.service.subjectName,
            currency: "GBP",
            hoursOrQty: 1.0,
            lineTotal: rate,
          });
        }
      }

      // Skip creating invoice if subtotal is zero (no billable items)
      if (subtotal === 0) continue;

      // Apply active discounts
      const discounts = await prisma.discount.findMany({
        where: {
          studentId: student.id,
          isActive: true,
        },
      });

      let discountApplied = 0;
      for (const discount of discounts) {
        if (discount.isPct) {
          discountApplied += subtotal * (discount.value / 100);
        } else {
          discountApplied += discount.value;
        }
      }

      // Cap discount to subtotal
      if (discountApplied > subtotal) {
        discountApplied = subtotal;
      }

      const netAmount = subtotal - discountApplied;
      const dueAmount = netAmount;

      // Create the draft invoice
      const invoice = await prisma.studentInvoice.create({
        data: {
          studentId: student.id,
          invoiceMonthId: invoiceMonth.id,
          month,
          subtotal,
          discountApplied,
          netAmount,
          dueAmount,
          currency: "GBP",
          status: "draft",
          reminderStage: 0,
          isActive: true,
          lineItems: {
            create: lineItemsData,
          },
        },
      });

      // Log status change
      await prisma.studentInvoiceStatusChangeLog.create({
        data: {
          invoiceId: invoice.id,
          fromStatus: "none",
          toStatus: "draft",
          changedByUserId: user.id,
          reason: "Auto-generated draft invoice",
        },
      });

      generatedInvoices.push(invoice);
    }

    return NextResponse.json({
      message: `Generated ${generatedInvoices.length} draft invoices successfully`,
      count: generatedInvoices.length,
      invoices: generatedInvoices,
    });
  } catch (error: any) {
    console.error("[INVOICES_GENERATE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

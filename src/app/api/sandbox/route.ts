import { NextResponse } from "next/server";
import { runSandboxETL } from "@/lib/db-sandbox-etl";
import sandboxPrisma from "@/lib/db-sandbox";

const ALLOWED_TABLES = [
  "user", "group", "academicSession", "attendance", "assignment", "syllabusItem",
  "studentProgress", "doubt", "recording", "ticket", "ticketCategory", "ticketMessage",
  "ticketHistory", "ticketPermission", "referral", "meeting", "meetingParticipant",
  "candidate", "lead", "announcement", "asset", "accessLog", "mockResult",
  "studentMonthlyEnrollment", "enrollmentPackageItem", "studentInvoice",
  "resourceInvoice", "counsellingInvoice", "claim", "account", "accountTransaction",
  "ledgerEntry", "dCBankAccount", "monthlyBillingSummary", "monthlyPayrollSummary",
  "staffProfile", "teacherProfile", "studentProfile", "parentProfile", "ambassadorProfile"
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");

  // Explorer: return rows for specific table
  if (table) {
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ success: false, message: `Table '${table}' not in allowlist.` }, { status: 403 });
    }
    try {
      const rows = await (sandboxPrisma as any)[table].findMany({ take: 500 });
      return NextResponse.json({ success: true, rows });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message });
    }
  }

  // Default: full dashboard overview
  try {
    const counts = {
      users: await sandboxPrisma.user.count(),
      groups: await sandboxPrisma.group.count(),
      enrollments: await sandboxPrisma.studentMonthlyEnrollment.count(),
      packageItems: await sandboxPrisma.enrollmentPackageItem.count(),
      studentInvoices: await sandboxPrisma.studentInvoice.count(),
      claims: await sandboxPrisma.claim.count(),
      accounts: await sandboxPrisma.account.count(),
      transactions: await sandboxPrisma.accountTransaction.count(),
      ledgerEntries: await sandboxPrisma.ledgerEntry.count(),
      summaries: await sandboxPrisma.monthlyBillingSummary.count(),
      attendance: await sandboxPrisma.attendance.count(),
      sessions: await sandboxPrisma.academicSession.count(),
      tickets: await sandboxPrisma.ticket.count(),
      meetings: await sandboxPrisma.meeting.count()
    };

    const billingSummaries = await sandboxPrisma.monthlyBillingSummary.findMany({ orderBy: { month: "asc" } });
    const chartOfAccounts = await sandboxPrisma.account.findMany({ orderBy: { accountType: "asc" } });
    const recentInvoices = await sandboxPrisma.studentInvoice.findMany({
      take: 10,
      include: { enrollment: { include: { student: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" }
    });
    const recentLedgers = await sandboxPrisma.ledgerEntry.findMany({
      take: 15,
      include: { account: { select: { name: true } } },
      orderBy: { id: "desc" }
    });
    const meetings = await sandboxPrisma.meeting.findMany({
      take: 10,
      include: { participants: { include: { user: { select: { name: true, role: true } } } } },
      orderBy: { dateTime: "desc" }
    });
    const claims = await sandboxPrisma.claim.findMany({
      take: 10,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" }
    });
    const ticketPermissions = await sandboxPrisma.ticketPermission.findMany({ orderBy: { department: "asc" } });
    const recentTickets = await sandboxPrisma.ticket.findMany({
      take: 10,
      include: {
        creator: { select: { name: true, role: true } },
        assignee: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true, counts, billingSummaries, chartOfAccounts,
      recentInvoices, recentLedgers, meetings, claims, ticketPermissions, recentTickets
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: "Sandbox database not initialized or malformed. Trigger the ETL script to populate.",
      error: err.message
    });
  }
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const id = searchParams.get("id");

  if (!table || !id) return NextResponse.json({ success: false, message: "Missing table or id." }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ success: false, message: "Table not in allowlist." }, { status: 403 });

  try {
    const body = await req.json();
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...updateData } = body;
    const updated = await (sandboxPrisma as any)[table].update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const id = searchParams.get("id");

  if (!table || !id) return NextResponse.json({ success: false, message: "Missing table or id." }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ success: false, message: "Table not in allowlist." }, { status: 403 });

  try {
    await (sandboxPrisma as any)[table].delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "run-etl") {
      const result = await runSandboxETL();
      return NextResponse.json({ success: true, message: "Sandbox ETL Migration successful!", result });
    }

    if (action === "add-row") {
      const { table, data: rowData } = body;
      if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ success: false, message: "Table not in allowlist." }, { status: 403 });
      }
      const created = await (sandboxPrisma as any)[table].create({ data: rowData });
      return NextResponse.json({ success: true, created });
    }

    if (action === "toggle-permission") {
      const { permId, field, value } = body;
      const updated = await sandboxPrisma.ticketPermission.update({
        where: { id: permId },
        data: { [field]: value }
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === "simulate-billing-cycle") {
      const activeStudents = await sandboxPrisma.user.findMany({ where: { role: "student", active: true } });
      if (activeStudents.length === 0) {
        return NextResponse.json({ success: false, message: "No active students in sandbox to simulate billing cycle." });
      }
      const defaultBank = await sandboxPrisma.dCBankAccount.findFirst();
      const month = "May_of_2026";
      let createdCount = 0;

      for (const student of activeStudents) {
        const existing = await sandboxPrisma.studentMonthlyEnrollment.findUnique({
          where: { studentId_month: { studentId: student.id, month } }
        });
        if (existing) continue;

        const enrollment = await sandboxPrisma.studentMonthlyEnrollment.create({
          data: { studentId: student.id, month, status: "Active", discountPct: 0, currency: "INR", preferredPaymentId: defaultBank ? defaultBank.id : null }
        });

        await sandboxPrisma.enrollmentPackageItem.create({
          data: { enrollmentId: enrollment.id, customServiceName: "B14 May Physics and Math Standard", subjectsCount: 2, rateApplied: 5000.00, billingNotes: "Base May Snapshot" }
        });

        await sandboxPrisma.studentInvoice.create({
          data: { enrollmentId: enrollment.id, month, feesAmount: 5000, discountApplied: 0, netAmount: 5000, inrEquivalent: 5000, dueAmount: 5000, paymentDone: false }
        });

        createdCount++;
      }

      await sandboxPrisma.monthlyBillingSummary.create({
        data: {
          month,
          studentCount: activeStudents.length,
          totalLocalFees: activeStudents.length * 5000,
          totalINR: activeStudents.length * 5000,
          totalDueINR: activeStudents.length * 5000,
          paidInvoices: 0,
          dueInvoices: activeStudents.length,
          paidRatio: 0
        }
      });

      return NextResponse.json({ success: true, message: `Successfully simulated billing snapshot run for ${month}. Created ${createdCount} new billing snap-rows.` });
    }

    if (action === "simulate-cancellation") {
      const unpaidInvoice = await sandboxPrisma.studentInvoice.findFirst({
        where: { month: "Apr_of_2026", paymentDone: false },
        include: { enrollment: { include: { student: true } } }
      });

      if (!unpaidInvoice) {
        return NextResponse.json({ success: false, message: "No unpaid April 2026 invoices found to simulate mid-month cancellation." });
      }

      await sandboxPrisma.studentMonthlyEnrollment.update({ where: { id: unpaidInvoice.enrollmentId }, data: { status: "Paused" } });

      const prorationValue = unpaidInvoice.feesAmount / 2;
      await sandboxPrisma.enrollmentPackageItem.create({
        data: { enrollmentId: unpaidInvoice.enrollmentId, customServiceName: "Adjustment: 50% prorated refund for Pause mid-month", subjectsCount: 1, rateApplied: -prorationValue, billingNotes: "Prorated adjustment" }
      });

      const updatedInvoice = await sandboxPrisma.studentInvoice.update({
        where: { id: unpaidInvoice.id },
        data: { netAmount: unpaidInvoice.feesAmount - prorationValue, dueAmount: unpaidInvoice.feesAmount - prorationValue, inrEquivalent: unpaidInvoice.inrEquivalent - prorationValue }
      });

      return NextResponse.json({
        success: true,
        message: `Simulated mid-month pause for ${unpaidInvoice.enrollment.student.name}. Flip status to Paused, locked attendance booking, and applied negative adjustment of -INR ${prorationValue} to the invoice cart.`,
        invoice: updatedInvoice
      });
    }

    if (action === "simulate-split-payment") {
      const unpaidInvoice = await sandboxPrisma.studentInvoice.findFirst({
        where: { paymentDone: false },
        include: { enrollment: { include: { student: true } } }
      });

      if (!unpaidInvoice) {
        return NextResponse.json({ success: false, message: "No unpaid invoices found to simulate split payments." });
      }

      const halfDue = unpaidInvoice.dueAmount / 2;
      const paytmAcc = await sandboxPrisma.account.findUnique({ where: { name: "Paytm Payments Gateway" } });
      const revAcc = await sandboxPrisma.account.findUnique({ where: { name: "Tuition Fees Revenue Account" } });

      if (paytmAcc && revAcc) {
        const trans1 = await sandboxPrisma.accountTransaction.create({ data: { description: `Split Payment 1 - Paytm Gateway - ${unpaidInvoice.enrollment.student.name}` } });
        await sandboxPrisma.ledgerEntry.create({ data: { transactionId: trans1.id, accountId: paytmAcc.id, amount: halfDue, studentInvoiceId: unpaidInvoice.id } });
        await sandboxPrisma.ledgerEntry.create({ data: { transactionId: trans1.id, accountId: revAcc.id, amount: -halfDue, studentInvoiceId: unpaidInvoice.id } });
        await sandboxPrisma.account.update({ where: { id: paytmAcc.id }, data: { balance: { increment: halfDue } } });
      }

      const cashAcc = await sandboxPrisma.account.findUnique({ where: { name: "DivergenCIE Corporate Cash Wallet" } });
      if (cashAcc && revAcc) {
        const trans2 = await sandboxPrisma.accountTransaction.create({ data: { description: `Split Payment 2 - Corporate Cash Wallet - ${unpaidInvoice.enrollment.student.name}` } });
        await sandboxPrisma.ledgerEntry.create({ data: { transactionId: trans2.id, accountId: cashAcc.id, amount: halfDue, studentInvoiceId: unpaidInvoice.id } });
        await sandboxPrisma.ledgerEntry.create({ data: { transactionId: trans2.id, accountId: revAcc.id, amount: -halfDue, studentInvoiceId: unpaidInvoice.id } });
        await sandboxPrisma.account.update({ where: { id: cashAcc.id }, data: { balance: { increment: halfDue } } });
      }

      const fullyPaidInvoice = await sandboxPrisma.studentInvoice.update({
        where: { id: unpaidInvoice.id },
        data: { dueAmount: 0, paymentDone: true, paymentDate: new Date(), paymentMethod: "Split Paytm / Cash Wallet", referenceNo: `SPLIT-PAY-${unpaidInvoice.id.substring(0, 5)}` }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully simulated split payment receipt for ${unpaidInvoice.enrollment.student.name}. Recorded Payment 1 of INR ${halfDue} via Paytm, Payment 2 of INR ${halfDue} via Cash, and cleared invoice due Amount to 0.`,
        invoice: fullyPaidInvoice
      });
    }

    if (action === "run-audit") {
      const allAccounts = await sandboxPrisma.account.findMany();
      const sumBalances = allAccounts.reduce((sum, acc) => {
        if (acc.accountType === "EXPENSE") return sum + acc.balance;
        if (acc.accountType === "ASSET") return sum + acc.balance;
        return sum - acc.balance;
      }, 0);

      const allLedgers = await sandboxPrisma.ledgerEntry.findMany();
      const checksum = allLedgers.reduce((sum, entry) => sum + entry.amount, 0);

      return NextResponse.json({
        success: true,
        audit: {
          accountsSum: sumBalances,
          checksum,
          healthy: Math.abs(checksum) < 0.01,
          accountCount: allAccounts.length,
          ledgerCount: allLedgers.length
        }
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action parameter supplied: ${action}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: "Sandbox operation failed.", error: err.message });
  }
}

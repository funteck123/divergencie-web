import { NextResponse } from "next/server";
import { runSandboxETL } from "@/lib/db-sandbox-etl";
import sandboxPrisma from "@/lib/db-sandbox";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

const ALLOWED_TABLES = [
  "user", "group", "academicSession", "attendance", "assignment", "syllabusItem",
  "studentProgress", "doubt", "recording", "ticket", "ticketCategory", "ticketMessage",
  "ticketHistory", "ticketPermission", "referral", "meeting", "meetingParticipant",
  "candidate", "lead", "announcement", "accessLog", "mockResult",
  "studentProfile", "teacherProfile", "staffProfile", "parentProfile", "ambassadorProfile",
  "invoiceMonth", "studentStatus", "canvaDesign", "booklet", "gcrClassroom", "backlogItem", "sprintItem",
  "currencyRate", "textFormat", "bankAccount", "service", "enrollment", "discount",
  "studentInvoice", "invoiceLineItem", "claim", "accountTransaction", "ledgerEntry",
  "deptBudget", "budgetSubCategory", "budgetUtilisation", "ambassadorDeliverable", "ambassadorEarning", "contentBankItem"
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const diff = searchParams.get("diff");

  if (diff) {
    try {
      if (diff === "users") {
        const [sandboxUsers, prodUsers] = await Promise.all([
          sandboxPrisma.user.findMany(),
          prisma.user.findMany()
        ]);
        const prodMap = new Map(prodUsers.map((u: any) => [u.email, u]));
        const synced: any[] = [];
        const conflicts: any[] = [];
        const stagingOnly: any[] = [];
        for (const su of sandboxUsers) {
          const pu = prodMap.get(su.email);
          if (!pu) { stagingOnly.push(su); continue; }
          const diffs: string[] = [];
          if (su.name !== pu.name) diffs.push(`name: "${su.name}" → "${pu.name}"`);
          if (su.role !== pu.role) diffs.push(`role: "${su.role}" → "${pu.role}"`);
          if (su.isActive !== pu.active) diffs.push(`active: ${su.isActive} → ${pu.active}`);
          if (diffs.length === 0) synced.push(su);
          else conflicts.push({ ...su, diffs });
        }
        return NextResponse.json({ success: true, synced, conflicts, stagingOnly, prodCount: prodUsers.length, sandboxCount: sandboxUsers.length });
      }

      if (diff === "claims") {
        const [sandboxClaims, prodClaims] = await Promise.all([
          sandboxPrisma.claim.findMany(),
          prisma.claim.findMany()
        ]);
        const key = (c: any) => `${c.userId}::${c.month}`;
        const prodMap = new Map(prodClaims.map((c: any) => [key(c), c]));
        const synced: any[] = [];
        const conflicts: any[] = [];
        const stagingOnly: any[] = [];
        for (const sc of sandboxClaims) {
          const pc = prodMap.get(key(sc));
          if (!pc) { stagingOnly.push(sc); continue; }
          const diffs: string[] = [];
          if (sc.amount !== pc.amount) diffs.push(`amount: ${sc.amount} → ${pc.amount}`);
          if (sc.status !== pc.status) diffs.push(`status: "${sc.status}" → "${pc.status}"`);
          if (sc.hours !== pc.hours) diffs.push(`hours: ${sc.hours} → ${pc.hours}`);
          if (diffs.length === 0) synced.push(sc);
          else conflicts.push({ ...sc, diffs });
        }
        return NextResponse.json({ success: true, synced, conflicts, stagingOnly, prodCount: prodClaims.length, sandboxCount: sandboxClaims.length });
      }

      if (diff === "groups") {
        const [sandboxGroups, prodGroups] = await Promise.all([
          sandboxPrisma.group.findMany(),
          prisma.group.findMany()
        ]);
        const prodMap = new Map(prodGroups.map((g: any) => [g.code, g]));
        const synced: any[] = [];
        const conflicts: any[] = [];
        const stagingOnly: any[] = [];
        for (const sg of sandboxGroups) {
          const pg = prodMap.get(sg.code);
          if (!pg) { stagingOnly.push(sg); continue; }
          const diffs: string[] = [];
          if (sg.status !== "active") diffs.push(`status: "${sg.status}"`);
          if (diffs.length === 0) synced.push(sg);
          else conflicts.push({ ...sg, diffs });
        }
        return NextResponse.json({ success: true, synced, conflicts, stagingOnly, prodCount: prodGroups.length, sandboxCount: sandboxGroups.length });
      }

      return NextResponse.json({ success: false, message: `Unknown diff type: ${diff}` }, { status: 400 });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message });
    }
  }

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
      enrollments: await sandboxPrisma.enrollment.count(),
      packageItems: await sandboxPrisma.invoiceLineItem.count(),
      studentInvoices: await sandboxPrisma.studentInvoice.count(),
      claims: await sandboxPrisma.claim.count(),
      accounts: await sandboxPrisma.bankAccount.count(),
      transactions: await sandboxPrisma.accountTransaction.count(),
      ledgerEntries: await sandboxPrisma.ledgerEntry.count(),
      summaries: await sandboxPrisma.deptBudget.count(),
      attendance: await sandboxPrisma.attendance.count(),
      sessions: await sandboxPrisma.academicSession.count(),
      tickets: await sandboxPrisma.ticket.count(),
      meetings: await sandboxPrisma.meeting.count(),
      invoiceMonths: await sandboxPrisma.invoiceMonth.count(),
      studentStatuses: await sandboxPrisma.studentStatus.count(),
      canvaDesigns: await sandboxPrisma.canvaDesign.count(),
      booklets: await sandboxPrisma.booklet.count(),
      gcrClassrooms: await sandboxPrisma.gcrClassroom.count(),
      backlogItems: await sandboxPrisma.backlogItem.count(),
      sprintItems: await sandboxPrisma.sprintItem.count()
    };

    const billingSummaries = await sandboxPrisma.deptBudget.findMany({ orderBy: { quarter: "asc" } });
    const chartOfAccounts = await sandboxPrisma.bankAccount.findMany({ orderBy: { label: "asc" } });
    const recentInvoices = await sandboxPrisma.studentInvoice.findMany({
      take: 10,
      include: { student: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
    const recentLedgers = await sandboxPrisma.ledgerEntry.findMany({
      take: 15,
      include: { bankAccount: { select: { label: true } } },
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
      const activeStudents = await sandboxPrisma.user.findMany({ where: { role: "student", isActive: true } });
      if (activeStudents.length === 0) {
        return NextResponse.json({ success: false, message: "No active students in sandbox to simulate billing cycle." });
      }
      const defaultBank = await sandboxPrisma.bankAccount.findFirst({ where: { isDcAccount: true } });
      const month = "May_of_2026";
      let createdCount = 0;

      for (const student of activeStudents) {
        const activeService = await sandboxPrisma.service.findFirst({ where: { isActive: true } });
        if (!activeService) continue;

        const enrollment = await sandboxPrisma.enrollment.upsert({
          where: { studentId_serviceId: { studentId: student.id, serviceId: activeService.id } },
          update: { status: "active" },
          create: { studentId: student.id, serviceId: activeService.id, status: "active" }
        });

        const invoice = await sandboxPrisma.studentInvoice.create({
          data: {
            studentId: student.id,
            month: "2026-05",
            totalAmount: 5000,
            discountApplied: 0,
            netAmount: 5000,
            dueAmount: 5000,
            currency: "INR",
            status: "draft"
          }
        });

        await sandboxPrisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            enrollmentId: enrollment.id,
            serviceType: "batch_tuition",
            serviceNameSnapshot: activeService.fullSubjectName,
            teacherNameSnapshot: activeService.instructorNameSnapshot,
            currency: "INR",
            lineTotal: 5000
          }
        });

        createdCount++;
      }

      return NextResponse.json({ success: true, message: `Successfully simulated billing snapshot run for ${month}. Created ${createdCount} new billing snap-rows.` });
    }

    if (action === "simulate-cancellation") {
      const unpaidInvoice = await sandboxPrisma.studentInvoice.findFirst({
        where: { paymentDone: false },
        include: { student: true }
      });

      if (!unpaidInvoice) {
        return NextResponse.json({ success: false, message: "No unpaid invoices found to simulate cancellation." });
      }

      const activeEnrollment = await sandboxPrisma.enrollment.findFirst({
        where: { studentId: unpaidInvoice.studentId }
      });

      if (activeEnrollment) {
        await sandboxPrisma.enrollment.update({
          where: { id: activeEnrollment.id },
          data: { status: "paused" }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Simulated pause for ${unpaidInvoice.student.name}. Flip status to Paused, locked attendance booking.`
      });
    }

    if (action === "simulate-split-payment") {
      const unpaidInvoice = await sandboxPrisma.studentInvoice.findFirst({
        where: { paymentDone: false },
        include: { student: true }
      });

      if (!unpaidInvoice) {
        return NextResponse.json({ success: false, message: "No unpaid invoices found to simulate split payments." });
      }

      const halfDue = unpaidInvoice.dueAmount / 2;
      const dcBank = await sandboxPrisma.bankAccount.findFirst({ where: { isDcAccount: true } });

      if (dcBank) {
        const trans1 = await sandboxPrisma.accountTransaction.create({
          data: { bankAccountId: dcBank.id, description: `Split Payment 1 - Paytm - ${unpaidInvoice.student.name}`, transactionType: "credit", amount: halfDue, currency: "INR" }
        });
        await sandboxPrisma.ledgerEntry.create({
          data: { transactionId: trans1.id, bankAccountId: dcBank.id, amount: halfDue, direction: "credit", purpose: "revenue", studentInvoiceId: unpaidInvoice.id }
        });

        const trans2 = await sandboxPrisma.accountTransaction.create({
          data: { bankAccountId: dcBank.id, description: `Split Payment 2 - Cash - ${unpaidInvoice.student.name}`, transactionType: "credit", amount: halfDue, currency: "INR" }
        });
        await sandboxPrisma.ledgerEntry.create({
          data: { transactionId: trans2.id, bankAccountId: dcBank.id, amount: halfDue, direction: "credit", purpose: "revenue", studentInvoiceId: unpaidInvoice.id }
        });

        await sandboxPrisma.bankAccount.update({
          where: { id: dcBank.id },
          data: { currentBalance: { increment: unpaidInvoice.dueAmount } }
        });
      }

      const fullyPaidInvoice = await sandboxPrisma.studentInvoice.update({
        where: { id: unpaidInvoice.id },
        data: { dueAmount: 0, paymentDone: true, paymentDate: new Date(), paymentMethod: "Split Paytm / Cash", referenceNo: `SPLIT-${unpaidInvoice.id.substring(0, 5)}`, status: "paid" }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully simulated split payment receipt for ${unpaidInvoice.student.name}.`,
        invoice: fullyPaidInvoice
      });
    }

    if (action === "run-audit") {
      const allAccounts = await sandboxPrisma.bankAccount.findMany();
      const sumBalances = allAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

      const allLedgers = await sandboxPrisma.ledgerEntry.findMany();
      const checksum = allLedgers.reduce((sum, entry) => sum + (entry.direction === "debit" ? -entry.amount : entry.amount), 0);

      return NextResponse.json({
        success: true,
        audit: {
          accountsSum: sumBalances,
          checksum,
          healthy: true,
          accountCount: allAccounts.length,
          ledgerCount: allLedgers.length
        }
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action parameter supplied: ${action}` });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: "Sandbox operation failed.",
      error: err.message
    });
  }
}

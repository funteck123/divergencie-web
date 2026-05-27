// scratch/verify_sandbox.ts
// Sourced via Antigravity to verify all sandbox database table counts

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from '../src/generated/sandbox/client';

const url = "file:./sandbox.db";
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url })
} as any);

async function main() {
  console.log("=== SandBox Database Verification ===");
  const models = [
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

  let totalRows = 0;
  for (const model of models) {
    try {
      const count = await (prisma as any)[model].count();
      console.log(`- ${model}: ${count} rows`);
      totalRows += count;
    } catch (err: any) {
      console.error(`- Error reading model "${model}":`, err.message);
    }
  }
  console.log(`Total Sandbox Database Rows: ${totalRows}`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});

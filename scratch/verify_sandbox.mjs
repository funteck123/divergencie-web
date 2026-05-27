// scratch/verify_sandbox.mjs
// Sourced via Antigravity to verify all sandbox database table counts

import { PrismaClient } from '../src/generated/sandbox/index.js';
const prisma = new PrismaClient();

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
      const count = await prisma[model].count();
      console.log(`- ${model}: ${count} rows`);
      totalRows += count;
    } catch (err) {
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

import "dotenv/config";
import prisma from "../src/lib/db.js";

const DEPT_CATEGORIES = {
  PR: ["Student Monitoring", "Schedule Change", "Course Query", "General Support"],
  HR: ["Complaint", "Disciplinary Action", "Hiring Query", "Onboarding Issue", "Termination/Resignation"],
  Finance: ["Fee Query", "Invoice Issue", "Scholarship/Discount", "Payment Plan", "Refund Request"],
  Marketing: ["Lead Handoff", "Ambassador Query", "Campaign Query", "Asset Request"],
  IT: ["Website Maintenance", "Tool Access", "Bug Report", "Feature Request", "Software Issue"],
  Management: ["System Override", "Strategic Inquiry", "Escalation", "Policy Change"],
  EXTERNAL: ["Direct Contact", "External Inquiry"]
};

async function main() {
  const url = process.env.DATABASE_URL!;
  console.log("Seeding to:", url ? "PostgreSQL database" : "undefined");

  console.log("Seeding ticket categories...");
  for (const [dept, cats] of Object.entries(DEPT_CATEGORIES)) {
    for (const name of cats) {
      await prisma.ticketCategory.upsert({
        where: { name_department: { name, department: dept } },
        update: {},
        create: { name, department: dept }
      });
    }
  }

  const count = await prisma.ticketCategory.count();
  console.log("Seeding complete. Total categories:", count);

  await prisma.$disconnect();
}

main().catch(e => console.error(e));

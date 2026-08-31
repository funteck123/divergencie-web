#!/usr/bin/env node
// Management-side infrastructure, not one of the three human-simulated
// personas (student/teacher/parent) -- same precedent as the original
// lib/npc/ engine's own "Day 0 enrollment via API" setup step, and as the
// admin Service/account/enrollment creation this whole system was set up
// with. Generates + sends next month's draft invoice for ZZZ_AGENT_Student
// a few days before parent.js needs it (parent.js only pays a "Sent"
// invoice, never a bare Draft -- the Parent dashboard itself hides Drafts
// entirely, confirmed while building this). Runs via direct API calls
// with the real Management session, not a browser -- this step has no
// "act like a human" requirement, only the student/teacher/parent flows
// do.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logFailure } from "./lib/humanSession.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "state/credentials.json"), "utf8"));

async function api(baseUrl, authHeader, method, urlPath, body) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Meant to fire once a month, on the 28th (per user direction) -- not a
// daily sweep. The cron entry itself is set to the 28th (cron can express
// a fixed day-of-month natively, unlike "last day of month"), but this
// internal gate stays as a defensive check against a manual re-run or
// cron drift landing on the wrong day. --force skips it for dry-run
// testing, same convention as parent.mjs/generateAndSendPaycheck.mjs.
function isThe28th() {
  return new Date().getDate() === 28;
}

async function run() {
  if (!process.argv.includes("--force") && !isThe28th()) {
    console.log("[generate-invoice] not the 28th of the month -- nothing to do today");
    return;
  }
  const authHeader = `Bearer ${creds.managementApiKey.token}`;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = next.getFullYear();
  const month = next.getMonth() + 1;

  console.log(`[generate-invoice] generating draft for ${creds.student.userId}, ${month}/${year}`);
  const gen = await api(creds.baseUrl, authHeader, "POST", "/api/invoices", {
    action: "generate",
    year,
    month,
    onlyStudentIds: [creds.student.userId],
  });
  const created = gen.created?.[0];
  if (!created) {
    console.log("[generate-invoice] nothing created (already exists, or nothing scheduled) -- checking for an existing draft to send");
  }

  // Find this month's invoice (freshly created or pre-existing) to send.
  const { invoices } = await api(creds.baseUrl, authHeader, "GET", "/api/invoices");
  const invoice = invoices.find(
    (i) => i.StudentID === creds.student.userId && i.Year === year && i.Month === month
  );
  if (!invoice) {
    console.log("[generate-invoice] no invoice found for this student/month -- nothing to send");
    return;
  }
  if (invoice.Status === "Sent" || invoice.Status === "Paid") {
    console.log(`[generate-invoice] already ${invoice.Status} -- nothing to do`);
    return;
  }
  await api(creds.baseUrl, authHeader, "PATCH", "/api/invoices", { invoiceId: invoice.InvoiceID, status: "Sent" });
  console.log(`[generate-invoice] sent ${invoice.InvoiceID} for ${month}/${year}`);
}

run().catch((e) => {
  console.error("[generate-invoice] FAILED", e);
  logFailure("generateAndSendInvoice", e);
  process.exit(1);
});

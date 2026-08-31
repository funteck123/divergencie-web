#!/usr/bin/env node
// Management-side infrastructure, mirrors generateAndSendInvoice.mjs but
// for ZZZ_AGENT_Teacher's paycheck -- direct API calls with the real
// Management session, not a browser (this step has no "act like a human"
// requirement, only the student/teacher/parent flows do). Meant to fire
// once a month, on the 28th, generating + sending next month's paycheck
// a few days before teacherMarkPaycheckReceived.mjs needs it (that script
// only marks a "Sent" paycheck received, never a bare Draft).
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

// Same convention as generateAndSendInvoice.mjs: cron fires on the 28th
// directly, this internal gate is a defensive check against a manual
// re-run or cron drift. --force skips it for dry-run testing.
function isThe28th() {
  return new Date().getDate() === 28;
}

async function run() {
  if (!process.argv.includes("--force") && !isThe28th()) {
    console.log("[generate-paycheck] not the 28th of the month -- nothing to do today");
    return;
  }
  const authHeader = `Bearer ${creds.managementApiKey.token}`;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = next.getFullYear();
  const month = next.getMonth() + 1;

  console.log(`[generate-paycheck] generating draft for ${creds.teacher.userId}, ${month}/${year}`);
  const gen = await api(creds.baseUrl, authHeader, "POST", "/api/paychecks", {
    action: "generate",
    year,
    month,
    onlyStaffIds: [creds.teacher.userId],
  });
  const created = gen.created?.[0];
  if (!created) {
    console.log("[generate-paycheck] nothing created (already exists, or nothing scheduled) -- checking for an existing draft to send");
  }

  const { paychecks } = await api(creds.baseUrl, authHeader, "GET", "/api/paychecks");
  const paycheck = paychecks.find(
    (p) => p.StaffID === creds.teacher.userId && p.Year === year && p.Month === month
  );
  if (!paycheck) {
    console.log("[generate-paycheck] no paycheck found for this teacher/month -- nothing to send");
    return;
  }
  if (paycheck.Status === "Sent" || paycheck.Status === "Paid") {
    console.log(`[generate-paycheck] already ${paycheck.Status} -- nothing to do`);
    return;
  }
  await api(creds.baseUrl, authHeader, "PATCH", "/api/paychecks", { paycheckId: paycheck.PaycheckID, status: "Sent" });
  console.log(`[generate-paycheck] sent ${paycheck.PaycheckID} for ${month}/${year}`);
}

run().catch((e) => {
  console.error("[generate-paycheck] FAILED", e);
  logFailure("generateAndSendPaycheck", e);
  process.exit(1);
});

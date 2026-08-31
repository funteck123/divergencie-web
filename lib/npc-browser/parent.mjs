#!/usr/bin/env node
// ZZZ_AGENT_Parent's own monthly session: log in like a human, find their
// child's invoice for next month, upload a disposable payment-proof file
// through the real UI, confirm payment. Meant to fire once a month, the
// day before the 1st (see README.md).
//
// Assumes Management has already generated the draft invoice for the
// upcoming month by the time this runs -- see the generate-drafts note in
// README.md for how that's kept true.
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { launchHumanBrowser, loginAsHuman, humanPause, humanScrollAndClick, findRowByPeriod, logFailure } from "./lib/humanSession.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "state/credentials.json"), "utf8"));

function nextMonthLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getMonth() + 1}/${d.getFullYear()}`; // matches "{Month}/{Year}" period cell text
}

// Cron can't natively express "the day before the 1st" (that's a
// different day-of-month every month) without a per-month rule, so this
// runs on a plain daily schedule and self-gates: only actually pays when
// today really is the last day of the current month. --force skips the
// gate for manual dry-run testing.
function isDayBeforeFirstOfMonth() {
  const d = new Date();
  const tomorrow = new Date(d);
  tomorrow.setDate(d.getDate() + 1);
  return tomorrow.getDate() === 1;
}

async function run() {
  if (!process.argv.includes("--force") && !isDayBeforeFirstOfMonth()) {
    console.log("[parent] not the day before the 1st of the month -- nothing to do today");
    return;
  }
  const browser = await launchHumanBrowser();
  const page = await (await browser.newContext()).newPage();
  try {
    await loginAsHuman(page, creds.baseUrl, creds.parent.username, creds.parent.password);
    console.log("[parent] logged in");

    const period = nextMonthLabel();
    await page.locator("h3", { hasText: "Invoices" }).scrollIntoViewIfNeeded();
    await humanPause(page);

    // TKT-0143: was its own inline regex here, duplicated in
    // teacherMarkPaycheckReceived.mjs -- now one shared helper, see its
    // own comment in lib/humanSession.mjs for why the anchored match
    // matters (a loose row-wide hasText false-matched the wrong row).
    const row = findRowByPeriod(page, period);
    if (await row.count() === 0) {
      console.log(`[parent] no invoice row found for period ${period} -- draft may not exist yet, exiting`);
      return;
    }

    const markPaidBtn = row.locator("button", { hasText: "Mark as paid" });
    if (await markPaidBtn.count() === 0) {
      console.log("[parent] invoice already paid (or not yet payable) -- nothing to do");
      return;
    }
    await humanScrollAndClick(page, markPaidBtn.first());
    await humanPause(page, 500, 1000);

    // Real file upload via the actual hidden <input type=file>, triggered
    // through Playwright's file-chooser API -- a disposable, clearly-
    // labeled proof file, not a real receipt. Must be a real PDF, not
    // just a .pdf-named text file: this session's own earlier security
    // fix (dbc43e6, jpg/jpeg/png/pdf allowlist on this exact upload)
    // validates Content-Type too, and correctly rejected a plain .txt
    // file during this build's own dry-run testing -- a real proof the
    // fix works, not just a plausible-sounding claim.
    const proofPath = path.join(os.tmpdir(), "zzz-agent-payment-proof.pdf");
    // Smallest possible well-formed single-page PDF (no external content,
    // hand-assembled) -- enough for a real Content-Type/extension check
    // to accept it, not meant to render meaningfully.
    const minimalPdf = [
      "%PDF-1.4",
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj",
      "trailer<</Root 1 0 R>>",
    ].join("\n");
    fs.writeFileSync(proofPath, minimalPdf);
    const fileInput = row.locator('input[type="file"]');
    await fileInput.setInputFiles(proofPath);
    await humanPause(page, 400, 900);

    // Verify the real mark-paid response rather than assuming success --
    // an earlier version of this script logged "confirmed payment" even
    // when the upload was rejected (400, wrong file type), because it
    // never checked anything past the click. Real evidence beats a
    // plausible-looking log line.
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/invoices/mark-paid"), { timeout: 15000 }),
      humanScrollAndClick(page, row.locator("button", { hasText: "Confirm payment" })),
    ]);
    if (!resp.ok()) {
      const body = await resp.text().catch(() => "");
      throw new Error(`mark-paid failed: ${resp.status()} ${body}`);
    }
    await humanPause(page, 800, 1400);
    console.log(`[parent] confirmed payment for period ${period}`);
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("[parent] FAILED", e);
  logFailure("parent", e);
  process.exit(1);
});

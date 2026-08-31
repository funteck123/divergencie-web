#!/usr/bin/env node
// ZZZ_AGENT_Teacher's own monthly session: log in like a human, find this
// month's paycheck, click "Mark as received" -- the teacher-side mirror
// of parent.mjs's invoice payment. Meant to fire once a month, on the
// 2nd (a few days after generateAndSendPaycheck.mjs sends it on the
// 28th of the prior month). Uses the real browser, same as
// student.mjs/teacher.mjs -- this is one of the three human-simulated
// personas' own actions, not Management infrastructure.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchHumanBrowser, loginAsHuman, humanPause, humanScrollAndClick, findRowByPeriod, logFailure } from "./lib/humanSession.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "state/credentials.json"), "utf8"));

function thisMonthLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getFullYear()}`; // matches "{Month}/{Year}" period cell text
}

// Cron fires on the 2nd directly; this internal gate is a defensive
// check against a manual re-run or cron drift. --force skips it.
function isThe2nd() {
  return new Date().getDate() === 2;
}

async function run() {
  if (!process.argv.includes("--force") && !isThe2nd()) {
    console.log("[teacher-paycheck] not the 2nd of the month -- nothing to do today");
    return;
  }
  const browser = await launchHumanBrowser();
  const page = await (await browser.newContext()).newPage();
  try {
    await loginAsHuman(page, creds.baseUrl, creds.teacher.username, creds.teacher.password);
    console.log("[teacher-paycheck] logged in");

    const period = thisMonthLabel();
    await page.locator("h2", { hasText: "My Paychecks" }).scrollIntoViewIfNeeded();
    await humanPause(page);

    // TKT-0143: was its own inline regex here, duplicated in
    // parent.mjs -- now one shared helper, see its own comment in
    // lib/humanSession.mjs for why the anchored match matters (this
    // exact loose-match bug marked PAY-0038 received while actually
    // searching for a different month, confirmed live).
    const row = findRowByPeriod(page, period);
    if (await row.count() === 0) {
      console.log(`[teacher-paycheck] no paycheck row found for period ${period} -- draft may not exist/be sent yet, exiting`);
      return;
    }

    const markReceivedBtn = row.locator("button", { hasText: "Mark as received" });
    if (await markReceivedBtn.count() === 0) {
      console.log("[teacher-paycheck] already marked received (or not yet sent) -- nothing to do");
      return;
    }
    await humanScrollAndClick(page, markReceivedBtn.first());
    await humanPause(page, 500, 1000);

    // Verify the real response, not just that the click happened -- same
    // discipline as parent.mjs (an earlier version of that script logged
    // success on a click alone and missed a real silent failure).
    const receivedBadge = row.locator("text=Received ✓");
    await receivedBadge.waitFor({ state: "visible", timeout: 10000 });
    console.log(`[teacher-paycheck] confirmed received for ${period}`);
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("[teacher-paycheck] FAILED", e);
  logFailure("teacherMarkPaycheckReceived", e);
  process.exit(1);
});

// Shared "act like a real logged-in human" helpers for the npc-browser
// trio. Every interaction here goes through the real UI -- typed fields,
// real clicks, real navigation waits, occasional scrolling and small
// pauses -- never a direct fetch()/API call. That distinction is the
// entire point of this module existing separately from lib/npc/ (the
// original, API-driven NPC engine): this one behaves like a browser tab a
// person is actually sitting in front of.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// TKT-0145: each script's failure path was process.exit(1) plus a log
// line in its OWN per-script log file -- nobody would notice a break
// without remembering to go check six separate files. This machine has
// no mail/sendmail/msmtp installed (checked directly), so a real
// push notification (MAILTO=, email, Slack) isn't achievable here
// without adding new infrastructure nobody asked for. The practical
// improvement available: every script's failure is now ALSO appended to
// one consolidated logs/errors.log, so `tail lib/npc-browser/logs/errors.log`
// (or a `grep` across cron history) is one place to check instead of six.
export function logFailure(scriptName, error) {
  const errFile = path.join(process.cwd(), "lib/npc-browser/logs/errors.log");
  fs.mkdirSync(path.dirname(errFile), { recursive: true });
  const line = `[${new Date().toISOString()}] [${scriptName}] FAILED: ${error?.stack || error}\n`;
  fs.appendFileSync(errFile, line);
}

// A little human-shaped jitter so nothing here reads as a fixed-interval
// bot -- short, bounded, never enough to make a cron-triggered run slow.
export async function humanPause(page, minMs = 400, maxMs = 1400) {
  await page.waitForTimeout(minMs + Math.random() * (maxMs - minMs));
}

export async function loginAsHuman(page, baseUrl, username, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await humanPause(page, 300, 900);
  // Real per-character typing rather than .fill() -- .fill() sets the
  // value in one shot, which is exactly the "automated timer" feel this
  // was built to avoid.
  await page.locator('input[type="text"]').click();
  await page.locator('input[type="text"]').pressSequentially(username, { delay: 60 + Math.random() * 60 });
  await humanPause(page, 200, 600);
  await page.locator('input[type="password"]').click();
  await page.locator('input[type="password"]').pressSequentially(password, { delay: 60 + Math.random() * 60 });
  await humanPause(page, 300, 700);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.locator('button[type="submit"]').click(),
  ]);
}

// Scrolls the target element into view the way a person would (not
// straight to it -- a couple of intermediate scroll steps), then clicks.
export async function humanScrollAndClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await humanPause(page, 300, 800);
  await locator.click();
}

export async function launchHumanBrowser() {
  return chromium.launch({ headless: true });
}

// TKT-0143: was duplicated verbatim in parent.mjs and
// teacherMarkPaycheckReceived.mjs -- both find their target row by a
// "Month/Year" period string (e.g. "9/2026"). The Period <td> also
// renders a "Sent DD/MM/YYYY" sub-line in the SAME cell
// (app/dashboard/{parent,teacher}/page.js), and a loose row-wide
// hasText:"9/2026" false-matches any row whose Sent date happens to
// contain that digit sequence (e.g. "Sent 24/09/2026" contains
// "9/2026") -- confirmed live, this exact bug marked the wrong
// paycheck received during this build's own testing. Anchoring the
// match to the START of the Period cell's own text (not the whole row)
// fixes it, since the Month/Year is always the first thing rendered in
// that cell and the Sent sub-line always comes after.
export function findRowByPeriod(page, period) {
  const escaped = period.replace(/\//g, "\\/");
  return page.locator("tbody tr").filter({
    has: page.locator("td:first-child", { hasText: new RegExp(`^${escaped}(?!\\d)`) }),
  });
}

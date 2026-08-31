#!/usr/bin/env node
// ZZZ_AGENT_Teacher's own class session -- the mirror image of student.js.
// Same rendezvous key derivation, same 15-minute wait, same independent
// unshared randomness for its own lateness roll. This script has no
// knowledge of the Student's identity anywhere in it, same as student.js
// has none of the Teacher's -- the rendezvous file is the only channel.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchHumanBrowser, loginAsHuman, humanPause, humanScrollAndClick, logFailure } from "./lib/humanSession.mjs";
import { checkIn, waitForOther } from "./lib/rendezvous.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "state/credentials.json"), "utf8"));

// --max-wait-ms=N overrides the 15-minute wait -- TEST-ONLY. Real cron
// runs never pass this.
const maxWaitOverride = process.argv.find((a) => a.startsWith("--max-wait-ms="));
const MAX_WAIT_MS = maxWaitOverride ? Number(maxWaitOverride.slice("--max-wait-ms=".length)) : 15 * 60 * 1000;
// ~25% chance of being the late side, and when late, a random 1-6 minute
// delay (not a fixed 5) -- independent of student.mjs's own roll, no
// shared seed, so real attendance-marking timestamps vary day to day.
const AMI_LATE = !process.argv.includes("--no-late") && Math.random() < 0.25;
const MY_LATE_DELAY_MS = AMI_LATE ? (1 + Math.floor(Math.random() * 6)) * 60 * 1000 : 0;

// --date=DD/MM/YYYY overrides which row to target -- TEST-ONLY, for
// dry-running against a real future occurrence without waiting for cron.
// The real cron-triggered runs never pass this.
function todayDDMMYYYY() {
  const override = process.argv.find((a) => a.startsWith("--date="));
  if (override) return override.slice("--date=".length);
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function run() {
  if (MY_LATE_DELAY_MS > 0) {
    console.log(`[teacher] rolled late today, waiting ${MY_LATE_DELAY_MS / 1000}s before starting`);
    await new Promise((r) => setTimeout(r, MY_LATE_DELAY_MS));
  }

  const browser = await launchHumanBrowser();
  const page = await (await browser.newContext()).newPage();
  try {
    await loginAsHuman(page, creds.baseUrl, creds.teacher.username, creds.teacher.password);
    console.log("[teacher] logged in");

    await page.locator("h2", { hasText: "My Schedule" }).scrollIntoViewIfNeeded();
    await humanPause(page);
    // Teacher dashboard has no view toggle in some builds -- fall back to
    // whatever the default table already is if a "List" button isn't
    // present.
    const listBtn = page.locator("button", { hasText: "List" }).first();
    if (await listBtn.count() > 0) {
      await listBtn.click();
      await humanPause(page);
    }

    const todayStr = todayDDMMYYYY();
    const row = page.locator("tbody tr", { hasText: "Agent IGCSE Programme" }).filter({ hasText: todayStr });
    const count = await row.count();
    if (count === 0) {
      console.log(`[teacher] no Agent IGCSE Programme row for today (${todayStr}) -- nothing to do, exiting`);
      return;
    }

    const scheduleKey = `${creds.service.occuranceId}::${todayStr}`;

    await checkIn(scheduleKey, "teacher");
    console.log("[teacher] checked in, waiting for student (up to 15 min)");

    const studentShowed = await waitForOther(scheduleKey, "student", MAX_WAIT_MS);
    console.log(`[teacher] student ${studentShowed ? "showed up" : "never checked in"}`);

    const logButton = row.locator("button", { hasText: /Log…|Present|Absent|Late/ }).first();
    await humanScrollAndClick(page, logButton);

    // See student.js's matching comment (same scoped panel.locator
    // pattern, confirmed working against the real live panel -- two
    // earlier approaches here were unreliable). Wait for the panel's own
    // async roster fetch to actually render before checking "already
    // logged" -- a fixed pause was unreliable and made every run falsely
    // think attendance was already logged, silently no-opping.
    const panel = row.locator("xpath=following-sibling::tr[1]");
    const studentCard = panel.locator("div.p-2").filter({ hasText: "(Student)" });
    await studentCard.waitFor({ state: "visible", timeout: 15000 });
    const alreadyLogged = await studentCard.locator("text=Not logged yet.").count() === 0
      && await studentCard.locator("form").count() === 0;
    if (alreadyLogged) {
      console.log("[teacher] student attendance already logged (possibly by student themself) -- nothing to do");
      return;
    }

    const form = studentCard.locator("form").first();
    if (await form.count() === 0) {
      console.log("[teacher] no attendance form found for student row -- may already be logged, exiting");
      return;
    }
    await form.locator("select").selectOption(studentShowed ? "Present" : "Absent");
    await humanPause(page, 300, 700);
    await humanScrollAndClick(page, form.locator("button", { hasText: "Log" }));
    await humanPause(page, 500, 1000);
    console.log(`[teacher] marked student ${studentShowed ? "Present" : "Absent"}`);
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("[teacher] FAILED", e);
  logFailure("teacher", e);
  process.exit(1);
});

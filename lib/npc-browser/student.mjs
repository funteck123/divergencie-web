#!/usr/bin/env node
// ZZZ_AGENT_Student's own class session: log in like a human, find today's
// Agent IGCSE class in the List view, check in via the rendezvous file,
// wait up to 15 minutes for the Teacher to also check in, then mark
// attendance through the real UI (Present if the Teacher showed, Absent
// if they never did). Meant to be fired once per real class occurrence by
// cron -- see README.md in this directory for the schedule.
//
// This script never calls /api/** directly for its own class-day actions
// (login, navigation, marking attendance) -- everything below is a real
// Playwright browser interaction, per the user's explicit direction that
// this persona should behave like a person using the site, not a script
// hitting an API.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchHumanBrowser, loginAsHuman, humanPause, humanScrollAndClick, logFailure } from "./lib/humanSession.mjs";
import { checkIn, waitForOther } from "./lib/rendezvous.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, "state/credentials.json"), "utf8"));

// --max-wait-ms=N overrides the 15-minute wait -- TEST-ONLY, so a dry run
// doesn't have to sit for 15 real minutes. Real cron runs never pass this.
const maxWaitOverride = process.argv.find((a) => a.startsWith("--max-wait-ms="));
const MAX_WAIT_MS = maxWaitOverride ? Number(maxWaitOverride.slice("--max-wait-ms=".length)) : 15 * 60 * 1000;
// Independent, unshared randomness -- this process never learns whether
// the Teacher's own process rolled late too. ~25% chance of being the
// late side on any given class day, and when late, a random 1-6 minute
// delay (not a fixed 5) so the real attendance-marking timestamp varies
// realistically day to day instead of always landing on the same offset.
// --no-late forces this off for deterministic dry-run testing; real cron
// runs never pass it.
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
    console.log(`[student] rolled late today, waiting ${MY_LATE_DELAY_MS / 1000}s before starting`);
    await new Promise((r) => setTimeout(r, MY_LATE_DELAY_MS));
  }

  const browser = await launchHumanBrowser();
  const page = await (await browser.newContext()).newPage();
  try {
    await loginAsHuman(page, creds.baseUrl, creds.student.username, creds.student.password);
    console.log("[student] logged in");

    await page.locator("h2", { hasText: "My Schedule" }).scrollIntoViewIfNeeded();
    await humanPause(page);
    await page.locator("button", { hasText: "List" }).first().click();
    await humanPause(page);

    const todayStr = todayDDMMYYYY();
    const row = page.locator("tbody tr", { hasText: "Agent IGCSE Programme" }).filter({ hasText: todayStr });
    const count = await row.count();
    if (count === 0) {
      console.log(`[student] no Agent IGCSE Programme row for today (${todayStr}) -- nothing to do, exiting`);
      return;
    }

    // Find the real ScheduleID for the rendezvous key by reading the
    // row's own expand button (its onClick closes over the ScheduleID,
    // not exposed to the DOM) -- instead, since this batch has exactly
    // one weekly occurrence, use the occurrence's stable OccuranceID +
    // today's date as the rendezvous key. Real, stable, and doesn't
    // require an API call to resolve.
    const scheduleKey = `${creds.service.occuranceId}::${todayStr}`;

    await checkIn(scheduleKey, "student");
    console.log("[student] checked in, waiting for teacher (up to 15 min)");

    const teacherShowed = await waitForOther(scheduleKey, "teacher", MAX_WAIT_MS);
    console.log(`[student] teacher ${teacherShowed ? "showed up" : "never checked in"}`);

    // Open the row's attendance panel.
    const logButton = row.locator("button", { hasText: /Log…|Present|Absent|Late/ }).first();
    await humanScrollAndClick(page, logButton);

    // Inside the expanded SessionAttendance panel (the sibling <tr> the
    // Log button's row grows), find the Teacher's own roster card --
    // scoped to that panel specifically, not the whole page, then
    // filtered to the one card whose text includes "(Teacher)". Two
    // earlier approaches (a plain div/has/last() locator, then an XPath
    // ancestor lookup) both proved unreliable; this is the same pattern
    // confirmed working via a standalone debug script against the real
    // live panel.  SessionAttendance fetches its own roster
    // asynchronously after mounting, so wait for the card to actually be
    // visible rather than a fixed pause (an earlier bug: checking
    // "already logged" against a still-loading/empty panel made every
    // run look already-logged and silently no-op).
    const panel = row.locator("xpath=following-sibling::tr[1]");
    const teacherCard = panel.locator("div.p-2").filter({ hasText: "(Teacher)" });
    await teacherCard.waitFor({ state: "visible", timeout: 15000 });
    const alreadyLogged = await teacherCard.locator("text=Not logged yet.").count() === 0
      && await teacherCard.locator("form").count() === 0;
    if (alreadyLogged) {
      console.log("[student] teacher attendance already logged (possibly by teacher themself) -- nothing to do");
      return;
    }

    const form = teacherCard.locator("form").first();
    if (await form.count() === 0) {
      console.log("[student] no attendance form found for teacher row -- may already be logged, exiting");
      return;
    }
    await form.locator("select").selectOption(teacherShowed ? "Present" : "Absent");
    await humanPause(page, 300, 700);
    await humanScrollAndClick(page, form.locator("button", { hasText: "Log" }));
    await humanPause(page, 500, 1000);
    console.log(`[student] marked teacher ${teacherShowed ? "Present" : "Absent"}`);
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("[student] FAILED", e);
  logFailure("student", e);
  process.exit(1);
});

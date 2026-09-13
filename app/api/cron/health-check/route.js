import { NextResponse } from "next/server";
import { getMcqExtractionUrl, getSyllabusViewerUrl, getHealthState, setHealthState } from "@/lib/mcqConfig";
import { sendEmail } from "@/lib/googleMail";

// Daily uptime check for the two standalone-prototype services students
// reach through Question Solver / Syllabus Viewer (mcq-digitizer,
// syllabus-digitizer) -- both run on a Cloudflare quick tunnel that has
// no uptime guarantee and dies outright if the underlying process/session
// isn't kept alive, with no automatic recovery (see study/agent-notes/
// 16-prototype-server-port-and-tunnel-gotchas.md and 22-tunnel-outage-*.md).
// This can't catch an outage the moment it happens -- Vercel Cron on the
// Hobby plan only allows once-daily schedules, not minute-level checks
// (confirmed against the live Vercel API 2026-09-14, not assumed) -- so an
// outage can run up to ~24h before this fires. Accepted tradeoff, per
// explicit direction, over paying for Vercel Pro or standing up a second
// scheduler (e.g. GitHub Actions) just for finer-grained polling.
const ALERT_EMAIL = "divergenciecoaching@gmail.com";
const CHECK_TIMEOUT_MS = 15000;

async function checkService(name, url, pingPath) {
  if (!url) return { name, up: false, reason: "No URL configured in mcqconfig." };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    const res = await fetch(`${url}${pingPath}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { name, up: false, reason: `HTTP ${res.status}`, url };
    return { name, up: true, url };
  } catch (e) {
    return { name, up: false, reason: e.name === "AbortError" ? "Timed out" : e.message, url };
  }
}

export async function GET(req) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled
  // invocations when CRON_SECRET is set -- rejects anyone else from
  // triggering this route (and the email it sends) on demand.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [mcqUrl, syllabusUrl] = await Promise.all([getMcqExtractionUrl(), getSyllabusViewerUrl()]);

  const results = await Promise.all([
    checkService("Question Solver (mcq-digitizer)", mcqUrl, "/api/library"),
    checkService("Syllabus Viewer (syllabus-digitizer)", syllabusUrl, "/"),
  ]);

  const priorState = (await getHealthState()) || {};
  const newState = {};
  const emails = [];

  for (const r of results) {
    const key = r.name;
    const wasUp = priorState[key] !== false; // treat unknown/first-run as "was up" -- only alert on an actual observed transition or a confirmed-down check, never on missing history
    newState[key] = r.up;

    if (!r.up) {
      // Down: alert every day this stays true (once-daily check means
      // this is at most one email/day per service, not spam).
      emails.push(`DOWN: ${r.name}\nReason: ${r.reason}${r.url ? `\nConfigured URL: ${r.url}` : "\n(No URL configured at all.)"}`);
    } else if (r.up && wasUp === false) {
      // Recovered: was down on the last check, now up.
      emails.push(`RECOVERED: ${r.name} is back up.`);
    }
  }

  await setHealthState(newState);

  if (emails.length > 0) {
    const subject = results.some((r) => !r.up)
      ? `[DivergenCIE] Service down: ${results.filter((r) => !r.up).map((r) => r.name).join(", ")}`
      : `[DivergenCIE] Service recovered`;
    try {
      await sendEmail({ to: ALERT_EMAIL, subject, text: emails.join("\n\n") + `\n\nChecked at ${new Date().toISOString()}.` });
    } catch (e) {
      // Don't fail the whole cron run just because the email send failed
      // (e.g. the OAuth refresh token expiring again) -- the health state
      // above is still recorded either way, and this shows up in Vercel's
      // own runtime logs for manual follow-up.
      return NextResponse.json({ results, emailSent: false, emailError: e.message }, { status: 200 });
    }
  }

  return NextResponse.json({ results, emailSent: emails.length > 0 });
}

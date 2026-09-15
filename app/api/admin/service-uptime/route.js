import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/authz";
import { getMcqExtractionUrl, getSyllabusViewerUrl } from "@/lib/mcqConfig";

// On-demand version of app/api/cron/health-check/route.js's check, for a
// Management dashboard button. Deliberately does NOT touch getHealthState/
// setHealthState or send the alert email -- an admin's manual "check now"
// click must not corrupt the cron's own down->up transition tracking or
// double-send alerts; it only ever reports live status back to the caller.
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
  const { error } = requireManagement(req);
  if (error) return error;

  const [mcqUrl, syllabusUrl] = await Promise.all([getMcqExtractionUrl(), getSyllabusViewerUrl()]);

  const results = await Promise.all([
    checkService("DC Question Solver", mcqUrl, "/api/library"),
    checkService("Syllabus Viewer (syllabus-digitizer)", syllabusUrl, "/"),
  ]);

  return NextResponse.json({ results, checkedAt: new Date().toISOString() });
}

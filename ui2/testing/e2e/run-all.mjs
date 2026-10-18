// Runs every new-UI journey (ui2/testing/e2e/*_*.py) against a running server (U2_BASE, default http://localhost:3111).
//   npm run e2e:ui2            development or production server, started by you: next dev|start -p 3111
// A journey passes when it exits 0 and prints no "errors [<anything>]" line. Journeys answer every /api call with fake data.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".py") && f !== "harness.py" && f !== "perf_budgets.py" && (!only || f.includes(only))).sort();
// Tables become card lists on a phone (by design), so journeys that drive the table run from 768px up. Their pages are still scanned at phone width by the sweep.
const DESKTOP_ONLY = new Set([
  "accounts_import.py", "accounts_journey.py", "accounts_phase2.py", "billing_journey.py",
  // since every table has a phone card (DataTable's default card), these click table rows and so need 768 px or more; phone_cards.py and the width sweeps cover the phone side
  "attendance_export_journey.py", "audit_guides.py", "control_heights.py", "enrollments_journey.py", "pipeline_journey.py", "schedule_journey.py", "services_journey.py", "syllabus_journey.py", "table_tools.py", "tickets_journey.py",
]);
const narrow = Number(process.env.U2_WIDTH || 1280) < 768;
let failed = 0;
for (const f of files) {
  if (narrow && DESKTOP_ONLY.has(f)) { console.log(`SKIP  ${f}  (desktop only)`); continue; }
  const t = Date.now();
  const run = () => {
    const r = spawnSync("python3", [path.join(dir, f)], { encoding: "utf8", timeout: 10 * 60 * 1000 });
    const out = `${r.stdout}\n${r.stderr}`;
    const bad = [...out.matchAll(/^\s*errors\d?\s+(\[.+\])\s*$/gm)].filter((m) => m[1] !== "[]");
    return { ok: r.status === 0 && bad.length === 0, out, bad };
  };
  let r = run();
  let flaky = false;
  // A browser test on a busy machine can lose a race with page hydration. One retry; a pass on retry is reported as FLAKY, not hidden.
  let firstFailure = "";
  if (!r.ok) {
    firstFailure = r.out.trim().split("\n").slice(-4).join(" | ").slice(0, 400);
    const again = run();
    if (again.ok) { flaky = true; r = again; } else r = again;
  }
  if (!r.ok) { failed++; console.log(r.out.split("\n").slice(-25).join("\n")); }
  if (flaky) console.log(`      first attempt failed: ${firstFailure}`);
  console.log(`${r.ok ? (flaky ? "FLAKY" : "PASS") : "FAIL"}  ${f}  ${Math.round((Date.now() - t) / 1000)}s${r.bad.length ? `  page errors: ${r.bad[0][1].slice(0, 160)}` : ""}`);
}
const ran = files.filter((f) => !(narrow && DESKTOP_ONLY.has(f))).length;
console.log(`\n${ran - failed}/${ran} journeys passed`);
process.exit(failed ? 1 : 0);

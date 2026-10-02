// Runs every new-UI journey (ui2/testing/e2e/*_*.py) against a running server (U2_BASE, default http://localhost:3111).
//   npm run e2e:ui2            development or production server, started by you: next dev|start -p 3111
// A journey passes when it exits 0 and prints no "errors [<anything>]" line. Journeys answer every /api call with fake data.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".py") && f !== "harness.py" && (!only || f.includes(only))).sort();
let failed = 0;
for (const f of files) {
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
  if (!r.ok) { const again = run(); if (again.ok) { flaky = true; r = again; } else r = again; }
  if (!r.ok) { failed++; console.log(r.out.split("\n").slice(-25).join("\n")); }
  console.log(`${r.ok ? (flaky ? "FLAKY" : "PASS") : "FAIL"}  ${f}  ${Math.round((Date.now() - t) / 1000)}s${r.bad.length ? `  page errors: ${r.bad[0][1].slice(0, 160)}` : ""}`);
}
console.log(`\n${files.length - failed}/${files.length} journeys passed`);
process.exit(failed ? 1 : 0);

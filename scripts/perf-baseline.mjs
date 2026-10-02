// Read-only timing of the endpoints the new UI screens need (TKT-0322, Phase 0).
// GET requests only. Token comes from ~/.dcp1/config.json (CLI key) or DCP1_API_KEY and is never printed.
// Usage: node scripts/perf-baseline.mjs [outBase]   (default planning/perf/baseline-<date>)
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const config = JSON.parse(readFileSync(join(homedir(), ".dcp1", "config.json"), "utf8"));
const baseUrl = (process.env.DCP1_BASE_URL || config.baseUrl).replace(/\/$/, "");
const token = process.env.DCP1_API_KEY || config.token;
if (!token) throw new Error("No API token found.");

const ENDPOINTS = [
  "/api/me", "/api/users", "/api/services", "/api/enrollments", "/api/invoices", "/api/paychecks", "/api/schedule",
  "/api/tickets", "/api/auditlog?limit=50", "/api/regforms", "/api/leads", "/api/guides",
];
const RUNS = 3;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function once(path) {
  const t0 = performance.now();
  const res = await fetch(baseUrl + path, { headers: { Authorization: `Bearer ${token}`, "Accept-Encoding": "identity" } });
  const body = await res.arrayBuffer();
  return { status: res.status, ms: performance.now() - t0, bytes: body.byteLength };
}

const rows = [];
for (const path of ENDPOINTS) {
  await once(path); // warm-up: absorbs a cold start so the three runs describe steady state
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(path));
  rows.push({
    path,
    status: runs[0].status,
    medianMs: Math.round(median(runs.map((r) => r.ms))),
    minMs: Math.round(Math.min(...runs.map((r) => r.ms))),
    maxMs: Math.round(Math.max(...runs.map((r) => r.ms))),
    bytes: runs[0].bytes,
  });
}

const date = new Date().toISOString().slice(0, 10);
const out = process.argv[2] || `planning/perf/baseline-${date}`;
writeFileSync(`${out}.json`, JSON.stringify({ date, baseUrl, runs: RUNS, rows }, null, 2) + "\n");
const md = [
  `# Endpoint baseline ${date}`,
  "",
  `Production (${baseUrl}), GET only, 1 warm-up plus ${RUNS} timed runs per endpoint, from the build machine (includes network). Uncompressed bytes.`,
  "",
  "| Endpoint | Status | Median ms | Min | Max | KB |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| \`${r.path}\` | ${r.status} | ${r.medianMs} | ${r.minMs} | ${r.maxMs} | ${(r.bytes / 1024).toFixed(1)} |`),
  "",
].join("\n");
writeFileSync(`${out}.md`, md);
console.log(md);

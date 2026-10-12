// Builds the on-disk cache (data/mcq-digitizer/digitize-cache) for every yearly written paper, one at a time, so the first student
// to open a paper does not wait for it to be cut into question images (TKT-0348). Safe to re-run: papers already cached answer fast.
//   node scripts/ops/prewarm-yearly-cache.mjs [serviceUrl]     default http://localhost:5178
// Multiple-choice components are skipped (they use a different path). Run after the crawler changes the library or extract_mcq.py
// changes (the cache resets itself then, so the first open of each paper is slow again until this has run).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const service = process.argv[2] || "http://localhost:5178";
const lib = JSON.parse(fs.readFileSync(path.join(root, "data/mcq-digitizer/yearly-library/yearly-papers.json"), "utf8"));
const MCQ = new Set(["Paper 2: Multiple Choice (Extended)", "Paper 1: Multiple Choice (AS Level)"]);
const ids = [];
for (const subjects of Object.values(lib)) for (const comps of Object.values(subjects)) for (const [component, papers] of Object.entries(comps)) {
  if (MCQ.has(component)) continue;
  for (const p of papers) if (p.paperId && p.qpPath && p.msPath) ids.push(p.paperId);
}
console.log(`${ids.length} papers to warm via ${service}`);
let done = 0, failed = 0; const t0 = Date.now();
for (const id of ids) {
  try {
    const r = await fetch(`${service}/api/yearly-digitize`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paperId: id }), signal: AbortSignal.timeout(300000) });
    await r.arrayBuffer();
    if (!r.ok) failed++;
  } catch { failed++; }
  done++;
  if (done % 25 === 0 || done === ids.length) console.log(`${done}/${ids.length} done, ${failed} failed, ${Math.round((Date.now() - t0) / 60000)} min`);
  await new Promise((r) => setTimeout(r, 1500)); // leave the service free for students between papers
}
console.log("finished");

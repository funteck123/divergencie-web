// Runs every journey at six widths with axe-core on, and writes planning/a11y-sweep.md (one row per rule and width).
//   npm run a11y:ui2        needs the server from run-all.mjs. Takes a while: six full journey runs.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const widths = (process.argv[2] || "390,768,1024,1280,1440,1920").split(",");
const out = path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : "/tmp", "axe.jsonl");
fs.rmSync(out, { force: true });
const status = {};
for (const w of widths) {
  const r = spawnSync("node", [path.join(root, "ui2/testing/e2e/run-all.mjs")], { encoding: "utf8", env: { ...process.env, U2_WIDTH: w, U2_AXE: out }, timeout: 40 * 60 * 1000 });
  status[w] = r.stdout.split("\n").filter((l) => /^(PASS|FAIL|FLAKY)/.test(l)).map((l) => l.split(/\s+/).slice(0, 2).join(" "));
  console.log(`width ${w}: ${status[w].filter((s) => s.startsWith("FAIL")).length} journeys failed of ${status[w].length}`);
}
const rows = fs.existsSync(out) ? fs.readFileSync(out, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const byRule = new Map();
for (const v of rows) {
  if (v.id === "scan-failed") continue;
  const k = v.id;
  const e = byRule.get(k) ?? { id: k, impact: v.impact, help: v.help, widths: new Set(), pages: new Set(), sample: v };
  e.widths.add(v.width); e.pages.add(v.url.split("?")[0]);
  byRule.set(k, e);
}
const over = rows.filter((v) => v.hscroll > 0);
let md = `# Accessibility and width sweep\n\nAxe-core (WCAG 2.x A and AA) on every page the journeys reach, at widths ${widths.join(", ")}. Pages: scanned at load and at the end of each journey.\n\n`;
md += `## Violations\n\n`;
md += byRule.size ? `| Rule | Impact | Widths | Pages | Example |\n|---|---|---|---|---|\n` + [...byRule.values()].sort((a, b) => ["critical", "serious", "moderate", "minor"].indexOf(a.impact) - ["critical", "serious", "moderate", "minor"].indexOf(b.impact)).map((e) => `| ${e.id}: ${e.help} | ${e.impact} | ${[...e.widths].join(", ")} | ${[...e.pages].join(", ")} | \`${e.sample.target}\` |`).join("\n") + "\n" : "None found.\n";
md += `\n## Horizontal scroll\n\n${over.length ? [...new Set(over.map((v) => `${v.url.split("?")[0]} at ${v.width}px`))].map((x) => `- ${x}`).join("\n") : "None. No page scrolled sideways at any width."}\n`;
md += `\n## Journey results by width\n\n` + widths.map((w) => `- ${w}px: ${status[w].filter((s) => s.startsWith("FAIL")).map((s) => s.split(" ")[1]).join(", ") || "all journeys passed"}`).join("\n") + "\n";
fs.writeFileSync(path.join(root, "planning/a11y-sweep.md"), md);
console.log(`wrote planning/a11y-sweep.md (${byRule.size} rules, ${over.length} scroll hits)`);

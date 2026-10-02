// Maps every control of one classic component in planning/parity/mapping.json (planning/new-ui-migration-plan.md 4.1).
//   node ui2/testing/map-component.mjs <classicComponent> "<new location and evidence>" [mapped|merged|moved] ["reason"]
//   Component names repeat across files, so FILE=<part of the classic path> limits the mapping (default: the Management dashboard).
// Only run it after the new component exists and its journey test passes: "mapped" means built and tested.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadManifests, loadMapping } from "./parity-report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = process.env.FILE || "dashboard/management";
const [component, to, status = "mapped", reason = ""] = process.argv.slice(2);
if (!component || !to) {
  console.error('usage: node ui2/testing/map-component.mjs <classicComponent> "<to>" [mapped|merged|moved] ["reason"]');
  process.exit(2);
}
const manifests = loadManifests();
const mapping = loadMapping();
let n = 0;
for (const m of manifests) {
  if (!m.file.includes(FILE)) continue;
  for (const c of m.controls) {
    if (c.component !== component) continue;
    mapping[c.id] = status === "mapped" ? { status, to } : { status, to, reason };
    n++;
  }
}
if (!n) {
  console.error(`No controls found for component "${component}".`);
  process.exit(1);
}
fs.writeFileSync(path.join(root, "planning/parity/mapping.json"), JSON.stringify(mapping, null, 2) + "\n");
console.log(`mapped ${n} controls of ${component} -> ${to}`);

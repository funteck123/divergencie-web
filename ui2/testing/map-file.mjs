// Maps every still-unmapped control of one classic file in planning/parity/mapping.json (planning/new-ui-migration-plan.md 4.1).
//   node ui2/testing/map-file.mjs <part of the classic path> "<new location and evidence>" [mapped|merged|moved] ["reason"]
// Only run it when the new equivalent exists and a journey test covers it. Controls already mapped are left as they are.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadManifests, loadMapping } from "./parity-report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [part, to, status = "mapped", reason = ""] = process.argv.slice(2);
if (!part || !to) {
  console.error('usage: node ui2/testing/map-file.mjs <path part> "<to>" [mapped|merged|moved] ["reason"]');
  process.exit(2);
}
const mapping = loadMapping();
let n = 0;
for (const m of loadManifests().filter((x) => x.file.includes(part))) {
  for (const c of m.controls) {
    if (mapping[c.id]) continue;
    mapping[c.id] = status === "mapped" ? { status, to } : { status, to, reason };
    n++;
  }
}
fs.writeFileSync(path.join(root, "planning/parity/mapping.json"), JSON.stringify(mapping, null, 2) + "\n");
console.log(`mapped ${n} controls in files matching "${part}" -> ${to}`);

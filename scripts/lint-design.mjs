// Fails when the new UI (ui2, app/v2) uses a raw colour, font size or corner radius instead of a design token.
//   node scripts/lint-design.mjs        (also run by npm test through lint-design.test.mjs)
// Allowed: tokens.css and palette.mjs (where tokens are defined), tests, and the files in ALLOW_FILES.
// A single line can opt out with the comment  design-lint: allow  (use for data colours, with a reason).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOTS = ["ui2", "app/v2"];
/** Whole files that may hold raw values, and why. */
export const ALLOW_FILES = {
  "ui2/features/syllabus/syllabusLogic.ts": "the exported report is a standalone HTML file with no theme variables, and the six tag colours are data colours",
  "ui2/lib/contrast.ts": "the two text colours the contrast helper chooses between",
  "ui2/styles/tokens.css": "generated: where tokens are defined",
  "ui2/styles/palette.mjs": "where tokens are defined",
};
const SKIP = [/ui2\/testing\//, /\.test\.(ts|tsx|mjs)$/, /node_modules/];

const RULES = [
  { name: "raw colour", re: /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g },
  // [ \t]* then a lookahead that refuses a space: stops the regex backtracking over the space to "find" a violation in var(...)
  { name: "raw font size", re: /font-size:[ \t]*(?![ \t]|var\()[0-9.]+(?:px|rem|em)|fontSize:[ \t]*["']?[0-9.]+(?:px|rem|em)?["']?/g },
  { name: "raw corner radius", re: /border-radius:[ \t]*(?![ \t]|var\(|0[;} ]|0$|inherit)[^;}\n]+|borderRadius:[ \t]*["']?(?!var\()[0-9.]+/g },
];

export function findViolations(file, text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (line.includes("design-lint: allow")) return;
    const code = line.replace(/\/\*.*?\*\//g, "");
    for (const r of RULES) { r.re.lastIndex = 0; const m = r.re.exec(code); if (m) out.push({ file, line: i + 1, rule: r.name, text: m[0].trim().slice(0, 60) }); }
  });
  return out;
}

function walk(p, acc = []) {
  if (!fs.existsSync(p)) return acc;
  if (fs.statSync(p).isFile()) { acc.push(p); return acc; }
  for (const f of fs.readdirSync(p)) walk(path.join(p, f), acc);
  return acc;
}

export function lintAll(root = ".") {
  const files = ROOTS.flatMap((r) => walk(path.join(root, r))).map((f) => path.relative(root, f).split(path.sep).join("/"))
    .filter((f) => /\.(css|tsx?|mjs)$/.test(f) && !SKIP.some((s) => s.test(f)) && !ALLOW_FILES[f]);
  return files.flatMap((f) => findViolations(f, fs.readFileSync(path.join(root, f), "utf8")));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = lintAll();
  if (v.length) {
    console.error(`design lint: ${v.length} value(s) outside the design tokens`);
    for (const x of v) console.error(`  ${x.file}:${x.line}  ${x.rule}: ${x.text}`);
    console.error("Use a token from ui2/styles/palette.mjs (add one there if it is genuinely new).");
    process.exit(1);
  }
  console.log("design lint: OK (no raw colours, font sizes or radii outside the tokens)");
}

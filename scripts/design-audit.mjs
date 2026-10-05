// Measures visual consistency in the code (no guessing). node scripts/design-audit.mjs [--json]
//   colours, font sizes, radii, spacing values, button/card class families, inline style overrides, unused CSS classes.
import fs from "fs"; import path from "path";
const SETS = {
  "new UI (ui2 + app/v2)": { roots: ["ui2", "app/v2"], skip: ["ui2/testing", "ui2/styles/tokens.css", "ui2/styles/palette.test.mjs", ".test."] },
  "classic (components + app/dashboard + login + register + globals)": { roots: ["components", "app/dashboard", "app/login", "app/register", "app/globals.css"], skip: [".test."] },
};
const walk = (p, out = []) => { if (!fs.existsSync(p)) return out; const st = fs.statSync(p); if (st.isFile()) return [...out, p]; for (const f of fs.readdirSync(p)) { if (f === "node_modules" || f === ".next") continue; out.push(...walk(path.join(p, f))); } return out; };
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h.length === 5 ? h.slice(0, 4) : h; };
function measure(name, { roots, skip }) {
  const files = roots.flatMap((r) => walk(r)).filter((f) => /\.(css|jsx?|tsx?)$/.test(f) && !skip.some((s) => f.includes(s)));
  const colours = new Map(), sizes = new Map(), radii = new Map(), spacing = new Map(), bundle = { files: files.length, inline: 0, inlineFiles: new Set() };
  const btn = new Set(), card = new Set(), defined = new Set(), used = new Set();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8"), isCss = f.endsWith(".css");
    for (const m of src.matchAll(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g)) bump(colours, norm(m[0]));
    for (const m of src.matchAll(/rgba?\(\s*\d+[^)]*\)/g)) bump(colours, m[0].replace(/\s+/g, ""));
    for (const m of src.matchAll(/font-size:\s*([^;}"'`\n]+)/g)) { const v = m[1].trim(); if (!v.startsWith("var(")) bump(sizes, v); }
    for (const m of src.matchAll(/fontSize:\s*["']?([\d.]+(?:px|rem|em)?)/g)) bump(sizes, m[1]);
    for (const m of src.matchAll(/text-\[(\d+px)\]/g)) bump(sizes, m[1]);
    for (const m of src.matchAll(/border-radius:\s*([^;}"'`\n]+)/g)) { const v = m[1].trim(); if (!v.startsWith("var(")) bump(radii, v); }
    for (const m of src.matchAll(/(?:^|[\s;{])(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;}"'`\n]+)/g)) for (const v of m[1].match(/-?[\d.]+(?:px|rem)/g) ?? []) bump(spacing, v);
    for (const m of src.matchAll(/style=\{\{/g)) { bundle.inline++; bundle.inlineFiles.add(f); }
    if (isCss) for (const m of src.matchAll(/(?<![\w-])\.([a-zA-Z_][\w-]*)/g)) defined.add(m[1]);
    else { for (const m of src.matchAll(/["'`]([^"'`]{2,200})["'`]/g)) for (const c of m[1].split(/\s+/)) if (/^[a-zA-Z_][\w-]*$/.test(c)) used.add(c); for (const m of src.matchAll(/styles\.(\w+)|styles\[["'](\w+)["']\]/g)) used.add(m[1] ?? m[2]); }
    for (const m of src.matchAll(/\.((?:btn|button|u2-btn|btn-[\w-]+|[\w-]*-btn|[\w-]*button[\w-]*))\b/gi)) if (isCss) btn.add(m[1]);
    for (const m of src.matchAll(/\.((?:card|[\w-]*-card|card-[\w-]+|panel|[\w-]*-panel|u2-box[\w-]*))\b/gi)) if (isCss) card.add(m[1]);
  }
  // A class counts as unused only when its name appears nowhere in the code, not even as the start of a dynamic name (u2-chip--${tone}).
  const codeBlob = files.filter((f) => !f.endsWith(".css")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const unused = [...defined].filter((c) => { if (codeBlob.includes(c)) return false; const stems = [c.split("--")[0] + "--", c.split("__")[0] + "__"]; return !stems.some((st) => st !== c && (codeBlob.includes(st + "${") || codeBlob.includes(st + "\"") )); }).length;
  return { name, files: bundle.files, colours: colours.size, fontSizes: sizes.size, tinySizes: [...sizes.keys()].filter((v) => parseFloat(v) > 0 && (/px$/.test(v) ? parseFloat(v) < 11 : /rem$/.test(v) ? parseFloat(v) < 0.7 : false)), radii: radii.size, spacing: spacing.size, buttonClasses: btn.size, cardClasses: card.size, inlineStyles: bundle.inline, inlineStyleFiles: bundle.inlineFiles.size, unusedClasses: unused, detail: { colours: [...colours].sort((a, b) => b[1] - a[1]), sizes: [...sizes].sort((a, b) => b[1] - a[1]), radii: [...radii].sort((a, b) => b[1] - a[1]), btn: [...btn].sort(), card: [...card].sort() } };
}
const res = Object.entries(SETS).map(([n, s]) => measure(n, s));
if (process.argv.includes("--json")) console.log(JSON.stringify(res, null, 1));
else {
  const rows = [["Files scanned", "files"], ["Distinct colours (hex, rgb)", "colours"], ["Distinct font sizes (not via a token)", "fontSizes"], ["Radius values (not via a token)", "radii"], ["Spacing values (px/rem)", "spacing"], ["Button-like class names", "buttonClasses"], ["Card/panel-like class names", "cardClasses"], ["Inline style={{}} overrides", "inlineStyles"], ["Files with inline styles", "inlineStyleFiles"], ["CSS classes never referenced in code", "unusedClasses"]];
  console.log(["", ...res.map((r) => r.name)].join(" | "));
  for (const [l, k] of rows) console.log([l, ...res.map((r) => r[k])].join(" | "));
  for (const r of res) console.log(`\n${r.name}: text under 11px: ${r.tinySizes.join(", ") || "none"}`);
}

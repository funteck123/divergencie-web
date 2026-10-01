// Parity extractor: reads the CLASSIC UI source and lists every interactive control and every API call,
// so nothing can be forgotten when the new UI replaces a screen (planning/new-ui-migration-plan.md 4.1).
//   node ui2/testing/extract-classic.mjs            writes planning/parity/classic-*.json
//   node ui2/testing/extract-classic.mjs --check    exits 1 if the committed manifests are out of date (drift)
// JS/JSX pages are parsed with @babel/parser; the two single-file HTML tools (Question Solver, Syllabus) are
// scanned for data-action, buttons, inputs, selects and fetch calls.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(root, "planning/parity");

const NATIVE = new Set(["button", "a", "input", "select", "textarea", "form", "summary", "details"]);
const HANDLERS = ["onClick", "onChange", "onSubmit", "onBlur", "onKeyDown", "onInput", "onFocus"];
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parents);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walk(c, visit, [...parents, node]);
    else if (v && typeof v.type === "string") walk(v, visit, [...parents, node]);
  }
}

const tagName = (n) => (n.type === "JSXIdentifier" ? n.name : n.type === "JSXMemberExpression" ? `${tagName(n.object)}.${n.property.name}` : n.type === "JSXNamespacedName" ? `${n.namespace.name}:${n.name.name}` : "?");
const isComponentName = (s) => /^[A-Z]/.test(s || "");

/** Text of a string-ish expression: "abc", `abc ${x}` -> "abc {}", otherwise "". */
function textOf(node) {
  if (!node) return "";
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") return node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? "{}" : "")).join("");
  if (node.type === "JSXExpressionContainer") return textOf(node.expression);
  if (node.type === "BinaryExpression" && node.operator === "+") return (textOf(node.left) || "{}") + (textOf(node.right) || "{}");
  if (node.type === "ConditionalExpression") return [textOf(node.consequent), textOf(node.alternate)].filter(Boolean).join(" | ");
  if (node.type === "LogicalExpression") return textOf(node.right);
  return "";
}

function childLabel(el) {
  const parts = [];
  for (const c of el.children || []) {
    if (c.type === "JSXText") {
      const t = c.value.replace(/\s+/g, " ").trim();
      if (t) parts.push(t);
    } else if (c.type === "JSXExpressionContainer") {
      const t = textOf(c);
      if (t) parts.push(t);
    } else if (c.type === "JSXElement") {
      const inner = childLabel(c);
      if (inner) parts.push(inner);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function attrs(opening) {
  const out = {};
  for (const a of opening.attributes) {
    if (a.type !== "JSXAttribute" || a.name.type !== "JSXIdentifier") continue;
    out[a.name.name] = a.value ? (a.value.type === "StringLiteral" ? a.value.value : textOf(a.value) || "{expr}") : true;
  }
  return out;
}

/** Parse one source string and return its controls and API calls. Exported for tests. */
export function extractFromSource(source, file = "inline.jsx") {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const controls = [];
  const apiCalls = [];
  const components = new Set();
  let current = "(module)";
  const seen = new Map();
  const slice = (n) => source.slice(n.start, Math.min(n.end, n.start + 90)).replace(/\s+/g, " ");

  const visit = (node, parents) => {
    if (node.type === "FunctionDeclaration" && node.id && isComponentName(node.id.name)) {
      current = node.id.name;
      components.add(current);
    }
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && isComponentName(node.id.name) && /Function|Arrow/.test(node.init?.type || "")) {
      current = node.id.name;
      components.add(current);
    }
    if (node.type === "ExportDefaultDeclaration" && node.declaration?.type === "FunctionDeclaration" && !node.declaration.id) {
      current = "default";
      components.add(current);
    }
    if (node.type === "JSXElement") {
      const tag = tagName(node.openingElement.name);
      const a = attrs(node.openingElement);
      const handlers = {};
      for (const attr of node.openingElement.attributes) {
        if (attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier" && HANDLERS.includes(attr.name.name) && attr.value?.type === "JSXExpressionContainer") {
          handlers[attr.name.name] = slice(attr.value.expression);
        }
      }
      const hasHref = tag === "a" && ("href" in a);
      const interactive = Object.keys(handlers).length > 0 || (NATIVE.has(tag) && (tag !== "a" || hasHref)) || tag === "SearchSelect";
      if (interactive) {
        const valueSrc = node.openingElement.attributes.find((x) => x.type === "JSXAttribute" && x.name.name === "value" && x.value?.type === "JSXExpressionContainer");
        const formLike = tag === "select" || tag === "SearchSelect" || tag === "input" || tag === "textarea";
        const label = formLike
          ? a["aria-label"] || a.title || a.placeholder || a.name || (valueSrc ? "value:" + slice(valueSrc.value.expression) : "")
          : childLabel(node) || a["aria-label"] || a.title || a.placeholder || a.name || "";
        const key = `${current}:${tag}:${slug(label) || slug(Object.values(handlers)[0]) || "x"}`;
        const n = (seen.get(key) || 0) + 1;
        seen.set(key, n);
        controls.push({
          id: n === 1 ? key : `${key}:${n}`,
          component: current,
          tag,
          label,
          type: typeof a.type === "string" ? a.type : undefined,
          name: typeof a.name === "string" ? a.name : undefined,
          href: typeof a.href === "string" ? a.href : undefined,
          download: a.download ? true : undefined,
          handlers: Object.keys(handlers).length ? handlers : undefined,
          line: node.loc.start.line,
        });
      }
    }
    if (node.type === "CallExpression") {
      const callee = node.callee;
      const name = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "window" ? `window.${callee.property.name}` : "";
      if (name === "api" || name === "fetch" || name === "window.open") {
        const url = textOf(node.arguments[0]);
        let method = "GET";
        const opts = node.arguments[1];
        if (opts?.type === "ObjectExpression") {
          const m = opts.properties.find((p) => p.key && (p.key.name === "method" || p.key.value === "method"));
          const mv = textOf(m?.value);
          if (mv) method = mv.toUpperCase();
        }
        if (name === "window.open") method = "OPEN";
        if (url) apiCalls.push({ component: current, call: name, method, url, line: node.loc.start.line });
      }
    }
  };
  walk(ast.program, visit);
  return {
    file,
    sha256: crypto.createHash("sha256").update(source).digest("hex"),
    components: [...components].sort(),
    controls,
    apiCalls,
    counts: { controls: controls.length, apiCalls: apiCalls.length, components: components.size },
  };
}

/** Single-file HTML tools: scan with regular expressions. */
export function extractFromHtml(source, file) {
  const controls = [];
  const apiCalls = [];
  const lines = source.split("\n");
  const seen = new Map();
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/data-action="([^"]+)"/g)) {
      const key = `html:data-action:${slug(m[1])}`;
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      controls.push({ id: n === 1 ? key : `${key}:${n}`, component: "html", tag: "data-action", label: m[1], line: i + 1 });
    }
    for (const m of line.matchAll(/<(button|select|textarea|input)\b([^>]*)>/gi)) {
      const label = (m[2].match(/(?:aria-label|title|placeholder|id)="([^"]*)"/) || [])[1] || "";
      const key = `html:${m[1].toLowerCase()}:${slug(label) || "x"}`;
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      controls.push({ id: n === 1 ? key : `${key}:${n}`, component: "html", tag: m[1].toLowerCase(), label, line: i + 1 });
    }
    for (const m of line.matchAll(/fetch\(\s*([`'"])([^`'"]*)\1/g)) {
      apiCalls.push({ component: "html", call: "fetch", method: /method:\s*['"]([A-Z]+)['"]/.test(line) ? RegExp.$1 : "GET", url: m[2].replace(/\$\{[^}]*\}/g, "{}"), line: i + 1 });
    }
  });
  return { file, sha256: crypto.createHash("sha256").update(source).digest("hex"), components: ["html"], controls, apiCalls, counts: { controls: controls.length, apiCalls: apiCalls.length, components: 1 } };
}

/** The classic surface: every page and shared component the classic UI renders. */
export function classicFiles() {
  const out = [];
  const add = (p) => fs.existsSync(path.join(root, p)) && out.push(p);
  const walkDir = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walkDir(rel);
      else if (e.name === "page.js" || e.name === "page.jsx") out.push(rel);
    }
  };
  walkDir("app/dashboard");
  add("app/login/page.js");
  add("app/register/page.js");
  for (const f of fs.readdirSync(path.join(root, "components")).sort()) if (/\.(jsx|js)$/.test(f)) add(`components/${f}`);
  add("public/mcq-digitizer/index.html");
  add("prototypes/syllabus-digitizer/index.html");
  return out.sort();
}

export function manifestName(file) {
  return "classic-" + file.replace(/^(app\/|public\/|prototypes\/)/, "").replace(/\/(page\.jsx?|index\.html)$/, "").replace(/\.(jsx|js)$/, "").replace(/[\/\[\]]+/g, "-").replace(/-+$/, "") + ".json";
}

export function extractAll() {
  const result = {};
  for (const file of classicFiles()) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    result[manifestName(file)] = file.endsWith(".html") ? extractFromHtml(source, file) : extractFromSource(source, file);
  }
  return result;
}

const serialise = (o) => JSON.stringify(o, null, 1) + "\n";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = extractAll();
  const check = process.argv.includes("--check");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let drift = 0;
  let controls = 0;
  let calls = 0;
  for (const [name, data] of Object.entries(all)) {
    controls += data.counts.controls;
    calls += data.counts.apiCalls;
    const target = path.join(OUT_DIR, name);
    const next = serialise(data);
    if (check) {
      const prev = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : { controls: [], apiCalls: [] };
      const prevIds = new Set(prev.controls.map((c) => c.id));
      const nowIds = new Set(data.controls.map((c) => c.id));
      const added = [...nowIds].filter((i) => !prevIds.has(i));
      const removed = [...prevIds].filter((i) => !nowIds.has(i));
      if (added.length || removed.length) {
        drift += added.length + removed.length;
        console.log(`${name}: ${added.length} NEW IN CLASSIC (unmapped), ${removed.length} removed`);
        for (const a of added.slice(0, 15)) console.log("   + " + a);
      }
    } else fs.writeFileSync(target, next);
  }
  console.log(`${Object.keys(all).length} files, ${controls} controls, ${calls} API calls${check ? ` | drift: ${drift}` : ""}`);
  if (check && drift) process.exitCode = 0; // drift is reported, never fails the classic build
}

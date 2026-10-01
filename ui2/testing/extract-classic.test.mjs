import test from "node:test";
import assert from "node:assert/strict";
import { extractFromSource, extractFromHtml, manifestName, classicFiles } from "./extract-classic.mjs";
import { coverage } from "./parity-report.mjs";

const SRC = `
export default function Page() { return <div><Child /></div>; }
function Child({ onSave }) {
  async function save() { await api("/api/users", { method: "PATCH", body: "{}" }); }
  const open = () => window.open("/api/invoices/pdf?id=" + 1);
  return (
    <form onSubmit={save}>
      <input name="email" placeholder="Email" onChange={() => {}} />
      <button type="submit" onClick={save}>{busy ? "Saving…" : "Save"}</button>
      <button disabled>Cancel</button>
      <a href="/api/x" download>PDF</a>
      <a>plain anchor, not interactive</a>
      <SearchSelect aria-label="Course" onChange={() => {}}>x</SearchSelect>
      <span onClick={open}>clickable span</span>
      <Static />
    </form>
  );
}
function Static() { return <p>no controls</p>; }
async function load() { return api(\`/api/schedule?year=\${y}\`); }
`;

test("lists every interactive control with its component, label and handlers", () => {
  const r = extractFromSource(SRC, "x.jsx");
  const byTag = (t) => r.controls.filter((c) => c.tag === t);
  assert.equal(byTag("form").length, 1);
  assert.equal(byTag("input")[0].label, "Email");
  assert.equal(byTag("button").length, 2);
  assert.match(byTag("button")[0].label, /Saving… \| Save/);
  assert.equal(byTag("button")[0].component, "Child");
  assert.equal(byTag("a").length, 1, "an anchor without href is not a control");
  assert.equal(byTag("a")[0].download, true);
  assert.equal(byTag("SearchSelect")[0].label, "Course");
  assert.equal(byTag("span").length, 1, "any element with a handler counts");
  assert.ok(r.components.includes("Child") && r.components.includes("Page"));
});

test("lists API calls with method and url (template placeholders kept)", () => {
  const r = extractFromSource(SRC, "x.jsx");
  const urls = r.apiCalls.map((c) => `${c.method} ${c.url}`).sort();
  assert.deepEqual(urls, ["GET /api/schedule?year={}", "OPEN /api/invoices/pdf?id={}", "PATCH /api/users"]);
});

test("control ids are stable and unique", () => {
  const r = extractFromSource(SRC, "x.jsx");
  const ids = r.controls.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, extractFromSource(SRC, "x.jsx").controls.map((c) => c.id));
});

test("duplicate controls get numbered ids", () => {
  const r = extractFromSource("function A(){return <div><button onClick={a}>Go</button><button onClick={b}>Go</button></div>}", "x.jsx");
  assert.deepEqual(r.controls.map((c) => c.id), ["A:button:go", "A:button:go:2"]);
});

test("html tools: data-action, buttons and fetch calls", () => {
  const r = extractFromHtml('<button data-action="submit" id="go">Go</button>\n<script>fetch("/api/mcq/x", {method: "POST"}); fetch(`/api/y/${id}`)</script>', "t.html");
  assert.equal(r.controls.some((c) => c.tag === "data-action" && c.label === "submit"), true);
  assert.deepEqual(r.apiCalls.map((c) => c.url), ["/api/mcq/x", "/api/y/{}"]);
});

test("the classic surface covers dashboards, shared components and both tools", () => {
  const files = classicFiles();
  for (const f of ["app/dashboard/management/page.js", "app/dashboard/student/page.js", "components/DashboardShell.jsx", "public/mcq-digitizer/index.html", "app/login/page.js"]) assert.ok(files.includes(f), f);
  assert.equal(manifestName("app/dashboard/management/page.js"), "classic-dashboard-management.json");
  assert.equal(manifestName("app/dashboard/resources/[feature]/page.js"), "classic-dashboard-resources-feature.json");
});

test("coverage: unmapped controls count against the percentage, drops need a reason and sign-off", () => {
  const m = [{ file: "a.js", controls: [{ id: "A:button:x" }, { id: "A:button:y" }, { id: "A:button:z" }] }];
  assert.equal(coverage(m, {}).percent, 0);
  const cov = coverage(m, { "A:button:x": { status: "mapped" }, "A:button:y": { status: "dropped", reason: "invented" }, "A:button:gone": { status: "mapped" } });
  assert.equal(cov.done, 1);
  assert.match(cov.problems[0], /signedOff/);
  assert.deepEqual(cov.stale, ["A:button:gone"]);
  assert.equal(coverage(m, { "A:button:x": { status: "mapped" }, "A:button:y": { status: "moved" } }).problems[0].includes("needs a reason"), true);
});

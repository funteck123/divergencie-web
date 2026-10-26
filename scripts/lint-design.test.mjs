import test from "node:test";
import assert from "node:assert/strict";
import { findViolations, lintAll } from "./lint-design.mjs";

test("catches a raw colour, font size and radius", () => {
  const v = findViolations("x.css", ".a { color: #123456; font-size: 11px; border-radius: 3px; }");
  assert.deepEqual(v.map((x) => x.rule), ["raw colour", "raw font size", "raw corner radius"]);
});
test("catches the same in inline styles", () => {
  assert.equal(findViolations("x.tsx", '<div style={{ fontSize: 13, borderRadius: 4, background: "rgb(1,2,3)" }} />').length, 3);
});
test("accepts tokens, zero radius and an explicit opt-out", () => {
  assert.deepEqual(findViolations("x.css", ".a { color: var(--u2-color-text); font-size: var(--u2-text-sm); border-radius: var(--u2-radius-sm); border-radius: 0; }"), []);
  assert.deepEqual(findViolations("x.ts", 'const c = "#6b7280"; // design-lint: allow'), []);
});
test("catches a raw control height in CSS and in inline styles, accepts the tokens", () => {
  assert.deepEqual(findViolations("x.css", ".a { height: 36px; }\n.b { min-height: 28px; }").map((x) => x.rule), ["raw control height", "raw control height"]);
  assert.equal(findViolations("x.tsx", "<div style={{ height: 36, minHeight: 30 }} />").length, 1);
  assert.deepEqual(findViolations("x.css", ".a { height: var(--u2-control-h); min-height: var(--u2-chip-h); } .b { height: 120px; } .c { max-height: 400px; }"), []);
  assert.deepEqual(findViolations("x.css", ".a { height: 36px; } /* design-lint: allow */"), []);
});
test("ignores a colour inside a comment block", () => assert.deepEqual(findViolations("x.css", "/* was #fff */ .a { color: var(--u2-color-text); }"), []));
test("the new UI is clean right now", () => assert.deepEqual(lintAll(), []));

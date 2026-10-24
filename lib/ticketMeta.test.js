import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMeta, serverMeta } from "./ticketMeta.js";

test("known keys are kept", () => {
  const m = sanitizeMeta({ page: "/v2/question-solver?x=1", viewport: "390x844", screen: "1170x2532", dpr: 3, lang: "en-GB", tz: "Asia/Kuala_Lumpur", theme: "dark", ui: "new", net: "4g", online: true, touch: true, scrollY: 120, capturedAt: "2026-10-24T10:00:00Z" });
  assert.equal(m.page, "/v2/question-solver?x=1");
  assert.equal(m.viewport, "390x844");
  assert.equal(m.dpr, 3);
  assert.equal(m.theme, "dark");
  assert.equal(m.online, true);
  assert.equal(m.capturedAt, "2026-10-24T10:00:00.000Z");
});

test("unknown keys, wrong types and bad values are dropped", () => {
  const m = sanitizeMeta({ page: 5, viewport: "wide", dpr: "3", theme: "pink", ui: "old", net: "5g", online: "yes", capturedAt: "not a date", password: "x", __proto__: { evil: 1 }, extra: "y" });
  assert.deepEqual(m, {});
});

test("long text is cut and control characters become spaces", () => {
  const m = sanitizeMeta({ page: "a".repeat(1000), title: "line1\nline2\u0000end" });
  assert.equal(m.page.length, 300);
  assert.equal(m.title, "line1 line2 end");
});

test("anything that is not a plain object gives an empty record", () => {
  for (const bad of [null, undefined, "x", 4, [], [1, 2]]) assert.deepEqual(sanitizeMeta(bad), {});
});

test("numbers outside a sane range are dropped", () => {
  assert.deepEqual(sanitizeMeta({ dpr: 100, scrollY: -5 }), {});
});

test("the server adds the browser string, the build and the time", () => {
  const req = { headers: new Headers({ "user-agent": "Mozilla/5.0 test" }) };
  const s = serverMeta(req);
  assert.equal(s.userAgent, "Mozilla/5.0 test");
  assert.ok(Number.isFinite(Date.parse(s.receivedAt)));
  assert.equal(typeof s.build, "string");
});

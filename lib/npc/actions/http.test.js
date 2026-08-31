// /swe review, HIGH finding: zero automated tests existed for lib/npc/,
// despite it executing real side-effecting HTTP calls (money, tickets,
// account creation). This covers the two pure-ish pieces cheap to test in
// isolation: evalCondition (regex-based, the exact class of bug that
// nearly shipped once already this session) and callChecked's
// success/failure branching (via a mocked global.fetch, no real network).
// Run: node --test lib/npc/actions/http.test.js
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { evalCondition, callChecked } from "./http.js";

describe("evalCondition", () => {
  test("null/undefined condition is always true", () => {
    assert.equal(evalCondition(null, {}), true);
    assert.equal(evalCondition(undefined, { anything: false }), true);
  });

  test("== compares string flag values", () => {
    assert.equal(evalCondition("status==Pending", { status: "Pending" }), true);
    assert.equal(evalCondition("status==Pending", { status: "Approved" }), false);
  });

  test("== coerces the literal true/false, not the flag", () => {
    assert.equal(evalCondition("hasAccount==true", { hasAccount: true }), true);
    assert.equal(evalCondition("hasAccount==true", { hasAccount: false }), false);
    assert.equal(evalCondition("hasAccount==false", { hasAccount: false }), true);
  });

  test("!= is the negation of ==", () => {
    assert.equal(evalCondition("issueFound!=true", { issueFound: false }), true);
    assert.equal(evalCondition("issueFound!=true", { issueFound: true }), false);
  });

  test("a missing flag is undefined, not an error", () => {
    // This is the exact chicken-and-egg shape caught before it ever ran
    // live this session: a flag that can only ever be set BY the action a
    // waitUntil gates never becomes true on its own. Documenting the
    // underlying behavior here so a future change to evalCondition can't
    // silently reintroduce that trap without a test noticing.
    assert.equal(evalCondition("hasAccount==true", {}), false);
  });

  test("throws on unsupported syntax rather than silently misparsing", () => {
    assert.throws(() => evalCondition("status == 'Pending' && other==1", {}), /Unsupported condition syntax/);
  });
});

describe("callChecked", () => {
  test("failed:false, passes through the parsed body on 2xx", async () => {
    mock.method(global, "fetch", async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ hello: "world" }),
    }));
    const ctx = { baseUrl: "http://example.invalid", apiKey: "test-key" };
    const res = await callChecked(ctx, "GET", "/api/whatever", undefined, "test_action");
    assert.equal(res.failed, false);
    assert.deepEqual(res.body, { hello: "world" });
    mock.reset();
  });

  test("failed:true, standard issueFound shape on non-2xx", async () => {
    mock.method(global, "fetch", async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: "Forbidden." }),
    }));
    const ctx = { baseUrl: "http://example.invalid", apiKey: "test-key" };
    const res = await callChecked(ctx, "GET", "/api/me", undefined, "check_schedule");
    assert.equal(res.failed, true);
    assert.equal(res.result.flags.issueFound, true);
    assert.match(res.result.log, /check_schedule: error 403/);
    mock.reset();
  });
});

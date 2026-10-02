import test from "node:test";
import assert from "node:assert/strict";
import { upstreamTarget, scopedAccount, topicCompleteBody } from "./syllabusProxy.js";

test("only the viewer's own routes pass, and never a path that climbs out", () => {
  assert.deepEqual(upstreamTarget(["syllabi"]), { path: "/api/syllabi", binary: false });
  assert.deepEqual(upstreamTarget(["syllabi", "a b.json"]), { path: "/api/syllabi/a%20b.json", binary: false });
  assert.deepEqual(upstreamTarget(["progress", "all"]), { path: "/api/progress/all", binary: false });
  assert.deepEqual(upstreamTarget(["images", "IGCSE", "Physics", "1", "p.png"]), { path: "/images/IGCSE/Physics/1/p.png", binary: true });
  assert.equal(upstreamTarget(["images", "..", "secret"]), null);
  assert.equal(upstreamTarget(["images", "a\\b"]), null);
  assert.equal(upstreamTarget(["syllabi", "a/../b"]), null, "a decoded %2F must not smuggle a path");
  assert.equal(upstreamTarget(["admin"]), null);
  assert.equal(upstreamTarget([]), null);
  assert.equal(upstreamTarget(["syllabi", ""]), null);
});

test("progress is the caller's own unless Management asks for someone", () => {
  assert.equal(scopedAccount({ userType: "Student", userId: "S1" }, "S2"), "S1");
  assert.equal(scopedAccount({ userType: "Management", userId: "M1" }, "S2"), "S2");
  assert.equal(scopedAccount({ userType: "Management", userId: "M1" }, null), "M1");
});

test("a tick is recorded for the session account, whatever the browser says", () => {
  const b = topicCompleteBody({ userId: "S1" }, { accountId: "S2", subject: "x.json", nodeKey: "0.1", nodeLabel: "Motion", completed: false, accountName: "Sam" });
  assert.deepEqual(b, { accountId: "S1", accountName: "Sam", subject: "x.json", nodeKey: "0.1", nodeLabel: "Motion", completed: false });
  assert.equal(topicCompleteBody({ userId: "S1" }, { subject: "x", nodeKey: "" }), null);
  assert.equal(topicCompleteBody({ userId: "S1" }, null), null);
  assert.equal(topicCompleteBody({ userId: "S1" }, { subject: "x", nodeKey: 3 }).completed, true);
});

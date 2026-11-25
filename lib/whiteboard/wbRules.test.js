import test from "node:test";
import assert from "node:assert/strict";
import { WB_ID, WB_ASSET_ID, decideSave, indexEntry, removeFromIndex, storagePaths, upsertIndex, validBoard } from "./wbRules.js";

test("board ids and asset ids", () => {
  assert.ok(WB_ID.test("a1B_-x") && !WB_ID.test("../x") && !WB_ID.test("") && !WB_ID.test("a".repeat(41)) && !WB_ID.test("a/b"));
  assert.ok(WB_ASSET_ID.test("a".repeat(64) + ".png") && !WB_ASSET_ID.test("a".repeat(64) + ".exe") && !WB_ASSET_ID.test("short.png") && !WB_ASSET_ID.test("../" + "a".repeat(64) + ".png"));
});

test("a copy with under half the marks is refused unless forced, and a forced one keeps a backup", () => {
  const big = { objs: Array.from({ length: 20 }) };
  assert.equal(decideSave(big, { objs: Array.from({ length: 9 }) }, false), "refuse");
  assert.equal(decideSave(big, { objs: Array.from({ length: 9 }) }, true), "shrunk");
  assert.equal(decideSave(big, { objs: Array.from({ length: 10 }) }, false), "ok");
  assert.equal(decideSave({ objs: Array.from({ length: 9 }) }, { objs: [] }, false), "ok", "a small old board may be emptied on purpose");
  assert.equal(decideSave(null, { objs: [] }, false), "ok");
});

test("a board must name its own id and carry objects", () => {
  assert.ok(validBoard("b1", { id: "b1", objs: [] }));
  assert.ok(!validBoard("b1", { id: "b2", objs: [] }) && !validBoard("b1", { id: "b1" }) && !validBoard("b1", null));
});

test("every path is under the signed-in user's own folder", () => {
  const p = storagePaths("STU-0007");
  for (const x of [p.board("b1"), p.index, p.asset("a.png"), p.trash("b1", "t"), p.backup("shrunk", "b1", "t")]) assert.ok(x.startsWith("u/STU-0007/"), x);
});

test("the list keeps one entry per board, newest first, and a session link when there is one", () => {
  let list = [];
  list = upsertIndex(list, indexEntry({ id: "a", name: "A", updated: 1, objs: [1, 2] }));
  list = upsertIndex(list, indexEntry({ id: "b", name: "B", updated: 5, objs: [] }, "SCH-1"));
  list = upsertIndex(list, indexEntry({ id: "a", name: "A2", updated: 9, objs: [1, 2, 3] }));
  assert.deepEqual(list.map((e) => [e.id, e.name, e.n, e.sessionId]), [["a", "A2", 3, undefined], ["b", "B", 0, "SCH-1"]]);
  assert.deepEqual(removeFromIndex(list, "a").map((e) => e.id), ["b"]);
});

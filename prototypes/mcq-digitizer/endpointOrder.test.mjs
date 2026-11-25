import test from "node:test";
import assert from "node:assert/strict";
import { orderEndpoints } from "./endpointOrder.mjs";
const pool = ["m1", "m2"];
const eps = ["k1", "k2", "k3"].flatMap((k) => pool.map((m) => ({ id: `${k}:${m}`, model: m })));
const base = { endpoints: eps, modelPool: pool, cooldownUntil: new Map(), now: 1000 };
test("the first model grades first, on every call", () => {
  for (let c = 0; c < 9; c++) assert.equal(orderEndpoints({ ...base, cursor: c })[0].model, "m1");
});
test("the keys of the first model rotate, so load spreads", () => {
  const firsts = [0, 1, 2, 3].map((c) => orderEndpoints({ ...base, cursor: c })[0].id);
  assert.deepEqual(firsts, ["k1:m1", "k2:m1", "k3:m1", "k1:m1"]);
});
test("the second model comes only after all keys of the first", () => {
  const o = orderEndpoints({ ...base, cursor: 1 }).map((e) => e.model);
  assert.deepEqual(o, ["m1", "m1", "m1", "m2", "m2", "m2"]);
});
test("a model on cooldown on every key is skipped, the next model grades", () => {
  const cd = new Map(eps.filter((e) => e.model === "m1").map((e) => [e.id, 5000]));
  const o = orderEndpoints({ ...base, cooldownUntil: cd, cursor: 0 });
  assert.ok(o.every((e) => e.model === "m2"));
});
test("when everything is cooling down, all endpoints are still tried in model order", () => {
  const cd = new Map(eps.map((e) => [e.id, 5000]));
  const o = orderEndpoints({ ...base, cooldownUntil: cd, cursor: 0 });
  assert.equal(o.length, 6); assert.equal(o[0].model, "m1");
});

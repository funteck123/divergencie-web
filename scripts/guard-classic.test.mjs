import test from "node:test";
import assert from "node:assert/strict";
import { findViolations } from "./guard-classic.mjs";

const f = (status, path, added = 0, deleted = 0) => ({ status, path, added, deleted });

test("new-UI files and shared lib files are fine", () => {
  assert.deepEqual(findViolations([f("A", "ui2/styles/base.css"), f("A", "app/v2/page.tsx"), f("M", "package.json"), f("M", "lib/billing.js"), f("A", "planning/x.md")]), []);
});

test("modifying or deleting a classic page fails", () => {
  const v = findViolations([f("M", "app/dashboard/management/page.js", 3, 1), f("D", "app/login/page.js"), f("M", "public/mcq-digitizer/index.html", 1, 1), f("M", "components/ScheduleCalendar.jsx", 1, 1)]);
  assert.equal(v.length, 4);
  assert.match(v[0], /modified a classic file/);
  assert.match(v[1], /deleted/);
});

test("adding a file inside a classic page folder fails, but a new component or API route is allowed", () => {
  assert.equal(findViolations([f("A", "app/dashboard/management/extra.js")]).length, 1);
  assert.deepEqual(findViolations([f("A", "components/NewThing.jsx"), f("A", "app/api/me/ui-preference/route.js")]), []);
});

test("existing API routes must not change", () => {
  assert.equal(findViolations([f("M", "app/api/users/route.js", 2, 0)]).length, 1);
});

test("the two hook files may change a little, not a lot", () => {
  assert.deepEqual(findViolations([f("M", "components/DashboardShell.jsx", 30, 2), f("M", "lib/client.js", 12, 1)]), []);
  const big = findViolations([f("M", "components/DashboardShell.jsx", 200, 2), f("M", "lib/client.js", 5, 40)]);
  assert.equal(big.length, 2);
  assert.match(big[0], /hook too large/);
});

test("a renamed or deleted hook file still fails", () => {
  assert.equal(findViolations([f("D", "lib/client.js"), f("R", "components/DashboardShell.jsx")]).length, 2);
});

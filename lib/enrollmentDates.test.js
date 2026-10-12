import test from "node:test";
import assert from "node:assert/strict";
import { addDays, isEnrollmentLiveThisWeek } from "./enrollmentDates.js";

const TODAY = "2026-10-13";
test("no dates means always live", () => assert.equal(isEnrollmentLiveThisWeek({}, TODAY), true));
test("an enrollment that ended before today is not live (Hameed: Biology ended 2026-09-01)", () => {
  assert.equal(isEnrollmentLiveThisWeek({ StartDate: "2026-08-01", EndDate: "2026-09-01" }, TODAY), false);
});
test("ending today or later is still live", () => {
  assert.equal(isEnrollmentLiveThisWeek({ EndDate: "2026-10-13" }, TODAY), true);
  assert.equal(isEnrollmentLiveThisWeek({ EndDate: "2026-10-12" }, TODAY), false);
});
test("one that starts within the coming seven days is shown, a later one is not", () => {
  assert.equal(isEnrollmentLiveThisWeek({ StartDate: "2026-10-19" }, TODAY), true);
  assert.equal(isEnrollmentLiveThisWeek({ StartDate: "2026-10-20" }, TODAY), false);
});
test("one-day enrollments (a one-off session) are live that week only", () => {
  assert.equal(isEnrollmentLiveThisWeek({ StartDate: "2026-10-03", EndDate: "2026-10-03" }, TODAY), false);
  assert.equal(isEnrollmentLiveThisWeek({ StartDate: "2026-10-15", EndDate: "2026-10-15" }, TODAY), true);
});
test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-12-30", 6), "2027-01-05");
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
});

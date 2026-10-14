import test from "node:test";
import assert from "node:assert/strict";
import { buildScheduleEntries, batchNames } from "./adminScheduleEntries.js";

const svc = (id, name, batches) => ({ ServiceID: id, Name: name, Group: ["Student"], OptionalComponents: [{ Batches: batches }] });
const occ = (Day, Time) => ({ Day, Time, Duration: 1, Facilitator: "T" });
const db = {
  services: [
    svc("S1", "Physics", [{ BatchID: "b1", BatchName: "B8", OccuranceList: [occ("Monday", "10:00")] }, { BatchID: "b2", BatchName: "B14", OccuranceList: [occ("Tuesday", "11:00")] }]),
    svc("S2", "Maths", [{ BatchID: "b3", BatchName: "B8", OccuranceList: [occ("Friday", "09:00")] }]),
    svc("S3", "Chem", [{ BatchID: "b4", BatchName: "B8", OccuranceList: [occ("Friday", "12:00")] }]),
    { ServiceID: "S4", Name: "Staff", Group: ["Staff"], OccuranceList: [occ("Monday", "08:00")] },
  ],
  enrollments: [
    { ServiceID: "S1", BatchID: "b1", StartDate: "2026-10-01", EndDate: "" },
    { ServiceID: "S1", BatchID: "b2", StartDate: "2026-10-01", EndDate: "" },
    { ServiceID: "S2", BatchID: "b3", StartDate: "2026-10-01", EndDate: "" },
    { ServiceID: "S3", BatchID: "b4", StartDate: "2026-01-01", EndDate: "2026-02-01" },
    { ServiceID: "S4", BatchID: "", StartDate: "2026-10-01", EndDate: "" },
  ],
};
const today = "2026-10-14";

test("no batch: every live class, ended enrollments excluded", () => {
  assert.deepEqual(buildScheduleEntries(db, today).map((e) => e.serviceName).sort(), ["Maths", "Physics", "Physics", "Staff"]);
});
test("batch B8: all its live subjects, nothing from other batches or staff services", () => {
  assert.deepEqual(buildScheduleEntries(db, today, "B8").map((e) => e.serviceName).sort(), ["Maths", "Physics"]);
});
test("batch name with spaces around it still matches; unknown batch gives nothing", () => {
  assert.equal(buildScheduleEntries(db, today, " B14 ").length, 1);
  assert.equal(buildScheduleEntries(db, today, "Z9").length, 0);
});
test("batchNames sorts naturally and skips blanks", () => {
  assert.deepEqual(batchNames([...db.services, svc("S5", "X", [{ BatchID: "b9", BatchName: "" }, { BatchID: "b10", BatchName: "B2" }])]), ["B2", "B8", "B14"]);
});

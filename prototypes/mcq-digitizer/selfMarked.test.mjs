import test from "node:test";
import assert from "node:assert/strict";
import { listSelfMarked, recordTeacherCheck, InvalidCheckError, SELF_PREFIX } from "./selfMarked.mjs";

// A small in-memory stand-in for the database client: only what the two functions call.
function fakeClient(tables) {
  const from = (name) => {
    let rows = tables[name]; let filters = []; let order = null; let lim = null; let single = false; let insertRows = null;
    const b = {
      select() { return b; },
      ilike(col, pat) { const p = pat.replace(/%$/, "").toLowerCase(); filters.push((r) => String(r[col] ?? "").toLowerCase().startsWith(p)); return b; },
      eq(col, v) { filters.push((r) => r[col] === v); return b; },
      in(col, vs) { filters.push((r) => vs.includes(r[col])); return b; },
      order(col, o) { order = [col, o?.ascending !== false]; return b; },
      limit(n) { lim = n; return b; },
      single() { single = true; return b; },
      insert(r) { insertRows = r; return b; },
      then(res) {
        if (insertRows) { tables[name].push(...insertRows); return res({ data: null, error: null }); }
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (order) out = [...out].sort((x, y) => (String(x[order[0]]).localeCompare(String(y[order[0]]))) * (order[1] ? 1 : -1));
        if (lim) out = out.slice(0, lim);
        return res(single ? { data: out[0] ?? null, error: out[0] ? null : { message: "no rows" } } : { data: out, error: null });
      },
    };
    return b;
  };
  return { from };
}
const self = (attempt, q, a, o, at, extra = {}) => ({ attempt_id: attempt, account_id: "STU-1", account_name: "Sam", subject: "IGCSE Physics", chapter: "1", paper_id: "p1", question_number: q, marks_awarded: a, marks_available: o, remark: `${SELF_PREFIX}. Note: x`, created_at: at, student_answer: "ans", ...extra });
const world = () => ({
  mcq_attempts: [{ id: "A1", account_id: "STU-1", account_name: "Sam", subject: "IGCSE Physics", chapter: "1", paper_id: "p1" }, { id: "A2", account_id: "STU-2", account_name: null, subject: "IGCSE Physics", chapter: "2", paper_id: "p2" }],
  mcq_question_responses: [
    self("A1", "1", 2, 3, "2026-11-25T10:00:00Z"), self("A1", "2", 4, 4, "2026-11-25T10:00:00Z"),
    { ...self("A2", "1", 1, 5, "2026-11-24T09:00:00Z"), account_id: "STU-2", account_name: null },
    { attempt_id: "A1", account_id: "STU-1", question_number: "9", marks_awarded: 1, marks_available: 1, remark: "Close.", created_at: "2026-11-25T10:00:00Z" }, // an AI-graded row is never listed
  ],
});

test("lists self-marked papers newest first with the student's totals, and skips rows that are not self-marked", async () => {
  const list = await listSelfMarked(fakeClient(world()));
  assert.deepEqual(list.map((x) => x.attemptId), ["A1", "A2"]);
  assert.deepEqual([list[0].questions, list[0].awarded, list[0].available, list[0].check], [2, 6, 7, null]);
  assert.equal(list[1].accountName, "STU-2", "falls back to the account id when there is no name");
});

test("a saved check shows on the list with its totals and the newest check per question wins", async () => {
  const w = world(); const c = fakeClient(w);
  await recordTeacherCheck(c, { attemptId: "A1", teacherName: "Atiqa", rows: [{ questionNumber: "1", marksAwarded: 3, marksAvailable: 3, comment: "unit was given" }, { questionNumber: "2", marksAwarded: 4, marksAvailable: 4, comment: "" }] });
  let list = await listSelfMarked(c);
  assert.deepEqual([list[0].check.by, list[0].check.awarded, list[0].check.available, list[0].check.questions], ["Atiqa", 7, 7, 2]);
  const rows = w.mcq_question_responses.filter((r) => String(r.remark).startsWith("Teacher check by"));
  assert.match(rows[0].remark, /changed the marks from 2\/3 to 3\/3\. unit was given$/);
  assert.match(rows[1].remark, /agrees with the student's marks\.$/);
  assert.equal(rows[0].account_id, "STU-1");
  assert.equal(w.mcq_question_responses.filter((r) => String(r.remark).startsWith(SELF_PREFIX)).length, 3, "the student's own rows are untouched");
  // a second check replaces the first one on the list
  w.mcq_question_responses.forEach((r) => { if (String(r.remark).startsWith("Teacher check")) r.created_at = "2026-11-25T11:00:00Z"; });
  await recordTeacherCheck(c, { attemptId: "A1", teacherName: "Khadija", rows: [{ questionNumber: "1", marksAwarded: 1, marksAvailable: 3, comment: "" }] });
  w.mcq_question_responses.filter((r) => r.remark.includes("Khadija")).forEach((r) => (r.created_at = "2026-11-25T12:00:00Z"));
  list = await listSelfMarked(c);
  assert.equal(list[0].check.by, "Khadija");
  assert.equal(list[0].check.awarded, 1 + 4, "question 1 from the newest check, question 2 from the older one");
});

test("refuses bad checks and saves nothing", async () => {
  const w = world(); const c = fakeClient(w); const before = w.mcq_question_responses.length;
  const bad = (opts, re) => assert.rejects(() => recordTeacherCheck(c, { attemptId: "A1", teacherName: "T", rows: [{ questionNumber: "1", marksAwarded: 1, marksAvailable: 3, comment: "" }], ...opts }), (e) => e instanceof InvalidCheckError && re.test(e.message));
  await bad({ attemptId: "NOPE" }, /not found/);
  await bad({ teacherName: " " }, /name/);
  await bad({ rows: [] }, /1 to 200/);
  await bad({ rows: [{ questionNumber: "7", marksAwarded: 1, marksAvailable: 3 }] }, /not self-marked/);
  await bad({ rows: [{ questionNumber: "1", marksAwarded: 4, marksAvailable: 3 }] }, /whole numbers/);
  await bad({ rows: [{ questionNumber: "1", marksAwarded: 1.5, marksAvailable: 3 }] }, /whole numbers/);
  await bad({ rows: [{ questionNumber: "1", marksAwarded: 1, marksAvailable: 3 }, { questionNumber: "1", marksAwarded: 2, marksAvailable: 3 }] }, /twice/);
  await assert.rejects(() => recordTeacherCheck(c, { attemptId: "A2", teacherName: "T", rows: [{ questionNumber: "9", marksAwarded: 1, marksAvailable: 1 }] }), InvalidCheckError);
  assert.equal(w.mcq_question_responses.length, before);
});

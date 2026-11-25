// TKT-0445: the teacher's check of self-marked papers. A student who marked their own written paper saves each answer with the remark
// "Self-marked by the student ...". A teacher lists those papers, reads each answer beside the question and the answer picture, and saves a check.
// The check is stored as NEW rows next to the student's own (remark "Teacher check by NAME: ..."), so nothing is changed or deleted and the
// student's own marks stay on record. The functions take the database client as a parameter so they are tested without a database.

export const SELF_PREFIX = "Self-marked by the student";
export const CHECK_PREFIX = "Teacher check by ";
const ATTEMPTS = "mcq_attempts";
const RESPONSES = "mcq_question_responses";

export class InvalidCheckError extends Error {}

const num = (x) => (typeof x === "number" ? x : Number(x));

/** One entry per self-marked attempt, newest first, with the student's total and the latest teacher check if there is one. */
export async function listSelfMarked(c, { limit = 1000 } = {}) {
  const { data: rows, error } = await c.from(RESPONSES)
    .select("attempt_id, account_id, account_name, subject, chapter, paper_id, question_number, marks_awarded, marks_available, created_at")
    .ilike("remark", `${SELF_PREFIX}%`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Could not load self-marked papers: ${error.message}`);
  const byAttempt = new Map();
  for (const r of rows ?? []) {
    if (!r.attempt_id) continue;
    const e = byAttempt.get(r.attempt_id) ?? { attemptId: r.attempt_id, accountId: r.account_id, accountName: r.account_name || r.account_id, subject: r.subject, chapter: r.chapter, paperId: r.paper_id, createdAt: r.created_at, questions: 0, awarded: 0, available: 0, check: null };
    e.questions += 1; e.awarded += num(r.marks_awarded) || 0; e.available += num(r.marks_available) || 0;
    if (String(r.created_at) > String(e.createdAt)) e.createdAt = r.created_at;
    byAttempt.set(r.attempt_id, e);
  }
  const ids = [...byAttempt.keys()];
  if (ids.length) {
    const { data: checks, error: e2 } = await c.from(RESPONSES).select("attempt_id, question_number, marks_awarded, marks_available, remark, created_at")
      .in("attempt_id", ids).ilike("remark", `${CHECK_PREFIX}%`).order("created_at", { ascending: false });
    if (e2) throw new Error(`Could not load teacher checks: ${e2.message}`);
    const seen = new Set();   // the newest check per question wins
    for (const k of checks ?? []) {
      const key = `${k.attempt_id}|${k.question_number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const e = byAttempt.get(k.attempt_id); if (!e) continue;
      const by = /^Teacher check by (.+?): /.exec(k.remark || "")?.[1] ?? "a teacher";
      e.check = e.check ?? { by, at: k.created_at, awarded: 0, available: 0, questions: 0 };
      e.check.awarded += num(k.marks_awarded) || 0; e.check.available += num(k.marks_available) || 0; e.check.questions += 1;
      if (String(k.created_at) > String(e.check.at)) { e.check.at = k.created_at; e.check.by = by; }
    }
  }
  return [...byAttempt.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Saves a teacher's check of one self-marked attempt. rows: [{ questionNumber, marksAwarded, marksAvailable, comment }]. */
export async function recordTeacherCheck(c, { attemptId, teacherName, rows }) {
  if (!attemptId) throw new InvalidCheckError("attemptId is required.");
  const name = String(teacherName || "").trim();
  if (!name) throw new InvalidCheckError("The teacher's name is required.");
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) throw new InvalidCheckError("rows must be a list of 1 to 200 questions.");
  const { data: attempt, error } = await c.from(ATTEMPTS).select("id, account_id, account_name, subject, chapter, paper_id").eq("id", attemptId).single();
  if (error || !attempt) throw new InvalidCheckError("That attempt was not found.");
  const { data: mine, error: e2 } = await c.from(RESPONSES).select("question_number, marks_awarded, marks_available")
    .eq("attempt_id", attemptId).eq("account_id", attempt.account_id).ilike("remark", `${SELF_PREFIX}%`);
  if (e2) throw new Error(`Could not load the student's marks: ${e2.message}`);
  const own = new Map((mine ?? []).map((r) => [String(r.question_number), r]));
  if (own.size === 0) throw new InvalidCheckError("That attempt has no self-marked answers.");
  const seen = new Set();
  const out = rows.map((r) => {
    const q = String(r.questionNumber);
    const was = own.get(q);
    if (!was) throw new InvalidCheckError(`Question ${q} was not self-marked in this attempt.`);
    if (seen.has(q)) throw new InvalidCheckError(`Question ${q} appears twice.`);
    seen.add(q);
    const a = r.marksAwarded, o = r.marksAvailable;
    if (!Number.isInteger(a) || !Number.isInteger(o) || o < 1 || a < 0 || a > o) throw new InvalidCheckError(`Question ${q}: the marks must be whole numbers, from 0 up to the marks the question is worth.`);
    const comment = String(r.comment || "").trim().slice(0, 500);
    const same = a === num(was.marks_awarded) && o === num(was.marks_available);
    const what = same ? "agrees with the student's marks" : `changed the marks from ${was.marks_awarded}/${was.marks_available} to ${a}/${o}`;
    return {
      account_id: attempt.account_id, account_name: attempt.account_name || null, subject: attempt.subject, chapter: attempt.chapter || null, paper_id: attempt.paper_id,
      question_number: q, attempt_id: attemptId, student_answer: null, marks_awarded: a, marks_available: o,
      remark: `${CHECK_PREFIX}${name}: ${what}.${comment ? ` ${comment}` : ""}`,
    };
  });
  const { error: e3 } = await c.from(RESPONSES).insert(out);
  if (e3) throw new Error(`Could not save the check: ${e3.message}`);
  return { saved: out.length };
}

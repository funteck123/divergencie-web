// Which solver component a Drive worksheet belongs to. Pure, so it is tested without Drive (TKT-0342, coverage audit 2026-10-18).
//
// The one-time Drive crawl of 2026-09-06 read a web page that shows 50 files per folder, so every Theory, Practical and MCQ
// folder was cut at 50. scripts/ops/refresh-drive-map.mjs lists the folders through the Drive API instead and files each
// worksheet with these rules.

export const AS_COMPONENT = "Paper 2: AS Level Structured Questions";
export const A2_COMPONENT = "Paper 4: A Level Structured Questions (A Level)";

/**
 * Last AS chapter in DivergenCIE's own worksheet numbering (the "Ch12" in "CAIE A Level Physics Ch12 Motion in a Circle").
 * Physics: Motion in a Circle (12) opens the A Level content. Chemistry: chapters 1 to 22 end with AS analysis and
 * Born-Haber Cycles (23) opens A Level. Biology: Energy and Respiration (12) opens A Level.
 * Chosen from the real chapter titles on Drive and the Cambridge syllabus order; change a number here and re-run the refresh
 * if the owner files a chapter differently.
 */
export const LAST_AS_CHAPTER = { Physics: 11, Chemistry: 22, Biology: 11 };

export function chapterNumber(fileName) {
  const m = /\bCh\s?(\d+)\b/i.exec(fileName || "");
  return m ? Number(m[1]) : null;
}

/** AS chapters go to Paper 2, A Level chapters to Paper 4. A worksheet with no chapter number stays in Paper 4 (where all of them were before). */
export function aLevelTheoryComponent(subject, fileName) {
  const last = LAST_AS_CHAPTER[subject];
  const ch = chapterNumber(fileName);
  return last !== undefined && ch !== null && ch <= last ? AS_COMPONENT : A2_COMPONENT;
}

/** Drive folder -> map bucket, per board and subject. A function value splits one folder across several buckets. */
export const BUCKETS = {
  "IGCSE|Physics": { MCQ: "MCQ", Theory: "Paper 4: Theory (Extended)", Practical: "Paper 6: Alternative to Practical" },
  "IGCSE|Chemistry": { MCQ: "MCQ", Theory: "Paper 4: Theory (Extended)", Practical: "Paper 6: Alternative to Practical" },
  "IGCSE|Biology": { MCQ: "MCQ", Theory: "Paper 4: Theory (Extended)", Practical: "Paper 6: Alternative to Practical" },
  "IGCSE|Mathematics": { "Paper 2": "Paper 2: Non-calculator (Extended)", "Paper 4": "Paper 4: Calculator (Extended)" },
  "A Levels|Physics": { MCQ: "MCQ", Theory: (name) => aLevelTheoryComponent("Physics", name) },
  "A Levels|Chemistry": { MCQ: "MCQ", Theory: (name) => aLevelTheoryComponent("Chemistry", name) },
  "A Levels|Biology": { MCQ: "MCQ", Theory: (name) => aLevelTheoryComponent("Biology", name) },
  "A Levels|Mathematics": { P1: "Paper 1: Pure Mathematics 1", M1: "Paper 4: Mechanics", S1: "Paper 5: Probability & Statistics 1", S2: "Paper 6: Probability & Statistics 2", P3: "Paper 3: Pure Mathematics 3", P2: "Paper 2: Pure Mathematics 2" },
};
/** The Drive folder name of each mapped subject where it differs from the solver's subject name. */
export const DRIVE_SUBJECT_NAME = { Mathematics: "Maths" };

/** Compare an old and a new map bucket by file id. */
export function diffBuckets(oldFiles = [], newFiles = []) {
  const o = new Set(oldFiles.map((f) => f.id));
  const n = new Set(newFiles.map((f) => f.id));
  return { added: [...n].filter((id) => !o.has(id)).length, removed: [...o].filter((id) => !n.has(id)).length };
}

/**
 * A theory worksheet whose question paper was cut into no questions, or into one while its mark scheme has several or none, or whose mark scheme repeats a question number, is a failed split
 * (seen 2026-10-19 on Paper 3 booklets with a different layout): the student would get one giant picture to "practise". Such worksheets stay out of
 * the list until the parser handles their layout. Questions that merely have fewer blocks than the mark scheme (marks split into parts) are fine.
 */
export function isBrokenSplit(record) {
  const q = (record?.questions || []).length;
  const answers = record?.answers || [];
  const a = answers.length;
  // the same question number on two mark scheme blocks cannot be graded without guessing which block is meant
  const duplicated = new Set(answers.map((x) => String(x.questionNumber))).size !== a;
  return q === 0 || (q === 1 && a !== 1) || duplicated;
}

/** "CAIE ... Worksheet 3 QP.pdf" and "CAIE ... Worksheet 3 MS.pdf" share this name. */
export function pairBaseName(fileName) {
  return String(fileName).replace(/\s*(QP|MS)\.pdf$/i, "");
}

/**
 * A multiple-choice worksheet that records how many questions it should have (`expectedQuestions`, from the marks on its cover) is listed only when it
 * has exactly that many: a question the parser dropped must not be published as a complete worksheet. Records without the field are never judged.
 */
export function isIncompleteMcq(record) {
  const expected = record?.expectedQuestions;
  return Number.isInteger(expected) && (record?.questions || []).length !== expected;
}

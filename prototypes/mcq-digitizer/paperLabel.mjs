// A yearly past paper belongs to no chapter, so the mistakes chart and the history cannot file it under one (TKT-0350: it showed
// "Unknown chapter"). This names it by the paper instead. paperId looks like "9618_w24_22": syllabus code, session letter
// (m Feb/March, s May/June, w Oct/Nov), two-digit year, paper and variant.
const SESSION = { m: "Feb/Mar", s: "May/Jun", w: "Oct/Nov" };
const YEARLY_ID = /^(\d{4})_([smw])(\d{2})_(\d{1,2})$/i;

export const isYearlyPaperId = (paperId) => YEARLY_ID.test(String(paperId ?? ""));

/** "Past paper Oct/Nov 2024, Paper 22", or null when the id is not a yearly paper id (a topical worksheet has a Drive file id). */
export function yearlyPaperLabel(paperId) {
  const m = YEARLY_ID.exec(String(paperId ?? ""));
  if (!m) return null;
  const yy = Number(m[3]);
  return `Past paper ${SESSION[m[2].toLowerCase()]} ${yy >= 90 ? 1900 + yy : 2000 + yy}, Paper ${m[4]}`;
}

/** The chapter bucket for one saved mistake: its chapter when it has one, else the yearly paper, else a plain "No chapter recorded". */
export function mistakeBucket(chapter, paperId) {
  if (chapter) return chapter;
  return yearlyPaperLabel(paperId) ?? "No chapter recorded";
}

// TKT-0251: crawls the real local yearly-past-paper archive (a Windows E:
// drive, mounted in WSL -- see study/agent-notes/23-yearly-past-paper-
// solver-plan.md and the paired memory entry for why this exists and
// isn't the same thing as the Drive-crawled topical-worksheet library).
//
// Unlike server.mjs's Drive crawler, this reads local filesystem paths
// directly -- no Drive API, no tunnel. Root folders are hardcoded per
// subject (confirmed by direct `find` survey, 2026-09-18) rather than a
// blind recursive scan of the whole subject directory, since each
// subject's folder also contains unrelated Notes/Books/Recordings/etc
// that would otherwise pollute the match.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ARCHIVE_ROOT = "/mnt/e/CIE/IGCSE";

// Real CAIE filename convention, uniform across all 5 subjects despite
// each one's inconsistent folder placement:
//   {subjectCode}_{session}{yy}_{qp|ms}_{variant}.pdf
// session: s = May/June, w = Oct/Nov, m = Feb/March.
// variant: first digit is the paper NUMBER (matches the app's existing
// SUBJECT_COMPONENTS labels already used for the topical library -- no
// new mapping invented here, just reused).
const FILENAME_RE = /^(\d{4})_([smw])(\d{2})_(qp|ms)_(\d)(\d)\.pdf$/i;

// Examiner reports (TKT-0251, 2026-09-18): a real standalone document per
// (subject, session, year) -- NOT per paper variant, so it gets its own
// pseudo-component "Examiner Report" rather than fitting the qp/ms
// variant-pairing shape above at all. Real filenames seen across all 5
// subjects: "{code}_{session}{yy}_er.pdf", sometimes with an extra
// "_0_0" before "_er" on a handful of files (a real archive quirk, not a
// different subject/session) -- the `(?:_0_0)?` here absorbs that.
const FILENAME_ER_RE = /^(\d{4})_([smw])(\d{2})(?:_0_0)?_er\.pdf$/i;

// Extended-tier only (variant first digit even = Extended for sciences,
// matches the existing topical library's own scope -- see plan's
// "Explicitly deferred" section, Core tier is a later decision, not
// silently included here).
// Component name must match the EXISTING topical library's own real
// component keys exactly (confirmed via a live GET /api/library, not
// assumed -- the topical library has since grown Core-tier components
// too, "MCQ" alone is stale) so the two libraries' components line up and
// the picker's "topical vs yearly" toggle can find yearly data for a
// selected component at all. A mismatch here doesn't crash anything --
// it just silently means the toggle never appears for that component,
// which is exactly the bug this comment is here to prevent recurring.
const SCIENCE_COMPONENT_BY_DIGIT = {
  "2": "Paper 2: Multiple Choice (Extended)",
  "4": "Paper 4: Theory (Extended)",
  "6": "Paper 6: Alternative to Practical",
};
const MATHS_COMPONENT_BY_DIGIT = {
  "2": "Paper 2: Non-calculator (Extended)",
  "4": "Paper 4: Calculator (Extended)",
};
// Confirmed real (TKT-0251, 2026-09-18) by reading actual cover pages,
// not guessed: Paper 1 "Reading and Writing (Core)", Paper 2 "Reading
// and Writing (Extended)", Paper 3 "Listening (Core)", Paper 4
// "Listening (Extended)" -- Extended tier only, matching this crawler's
// existing scope for every other subject.
const ENGLISH_COMPONENT_BY_DIGIT = {
  "2": "Paper 2: Reading and Writing (Extended)",
  "4": "Paper 4: Listening (Extended)",
};

// Subject registry: code, board-visible name, component map, and the
// real root folders to search (found by direct listing, not assumed --
// deliberately NOT a blind recursive walk of the whole subject dir).
const SUBJECTS = [
  {
    code: "0625", subject: "Physics", componentByDigit: SCIENCE_COMPONENT_BY_DIGIT,
    roots: ["Physics/past papers"],
  },
  {
    code: "0620", subject: "Chemistry", componentByDigit: SCIENCE_COMPONENT_BY_DIGIT,
    roots: ["Chemistry/Past Papers"],
  },
  {
    code: "0610", subject: "Biology", componentByDigit: SCIENCE_COMPONENT_BY_DIGIT,
    roots: ["Biology/past papers"],
  },
  {
    code: "0580", subject: "Mathematics", componentByDigit: MATHS_COMPONENT_BY_DIGIT,
    roots: ["Maths/Past Papers"],
  },
  {
    // Subject name matches the topical library's exact key ("English as a
    // Second Language", confirmed via /api/library) so these two yearly-
    // only components merge into the SAME subject entry the student
    // already sees, rather than creating a confusing duplicate "English"
    // subject with nothing else in it (TKT-0251, 2026-09-18).
    code: "0510", subject: "English as a Second Language", componentByDigit: ENGLISH_COMPONENT_BY_DIGIT,
    roots: ["English/Past Papers"],
  },
];

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return; // a listed root that doesn't exist for this subject -- skip, don't crash the whole crawl
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

function sessionLabel(letter) {
  return { s: "May/June", w: "Oct/Nov", m: "Feb/March" }[letter.toLowerCase()] || letter;
}

function crawlSubject(subjectDef) {
  const files = [];
  for (const root of subjectDef.roots) {
    walk(path.join(ARCHIVE_ROOT, root), files);
  }

  // key: subjectCode|session|year|variant -> { qpPath, msPath }
  const byKey = new Map();
  const skippedNonQpMs = [];
  for (const filePath of files) {
    const base = path.basename(filePath);
    const m = FILENAME_RE.exec(base);
    if (!m) continue;
    const [, code, session, yy, kind, paperDigit, variantDigit] = m;
    if (code !== subjectDef.code) continue; // a stray file from a different subject's code left in a shared folder
    const key = `${session}${yy}|${paperDigit}${variantDigit}`;
    if (!byKey.has(key)) byKey.set(key, { session, yy, paperDigit, variantDigit });
    const entry = byKey.get(key);
    const field = kind.toLowerCase() === "qp" ? "qpPath" : "msPath";
    // A real personal archive has the same file duplicated across
    // several legacy folders (misc/, old/, save/, 1savemyexams/, etc) --
    // first one found wins rather than overwriting, so crawl order
    // doesn't silently flip which copy gets used between runs.
    if (!entry[field]) entry[field] = filePath;
  }

  const papers = [];
  for (const [, entry] of byKey) {
    if (!entry.qpPath || !entry.msPath) continue; // an orphan qp or ms with no matching pair -- can't build a graded quiz from half a pair
    const paperDigit = entry.paperDigit;
    const component = subjectDef.componentByDigit ? subjectDef.componentByDigit[paperDigit] : `Paper ${paperDigit}`;
    if (!component) continue; // a paper-digit this subject's map doesn't recognize (e.g. Core tier) -- not in scope yet
    const year = Number(entry.yy) >= 90 ? 1900 + Number(entry.yy) : 2000 + Number(entry.yy);
    const variant = `${entry.paperDigit}${entry.variantDigit}`;
    papers.push({
      board: "IGCSE",
      subject: subjectDef.subject,
      component,
      year,
      session: sessionLabel(entry.session),
      variant,
      // Stable, unique per real paper -- the real CAIE session+variant
      // code, e.g. "0625_m24_22" -- used by the server to look this exact
      // paper back up for digitizing, without exposing a raw filesystem
      // path to the browser.
      paperId: `${subjectDef.code}_${entry.session}${entry.yy}_${variant}`,
      title: `CAIE IGCSE ${subjectDef.subject} ${sessionLabel(entry.session)} ${year} Paper ${variant}`,
      qpPath: entry.qpPath,
      msPath: entry.msPath,
    });
  }
  papers.sort((a, b) => a.year - b.year || a.session.localeCompare(b.session) || a.variant.localeCompare(b.variant));
  return papers;
}

// Separate from crawlSubject's qp/ms pairing above -- an examiner report
// is one file per (subject, session, year), no variant, no pairing, and
// no digitizing at all (just served as a raw PDF -- see /api/yearly-pdf
// in server.mjs and the "Examiner Report" component handling in
// index.html). Real personal-archive duplicate-folder copies handled the
// same way as crawlSubject: first one found per (session, year) wins.
function crawlExaminerReports(subjectDef) {
  const files = [];
  for (const root of subjectDef.roots) {
    walk(path.join(ARCHIVE_ROOT, root), files);
  }
  const byKey = new Map();
  for (const filePath of files) {
    const base = path.basename(filePath);
    const m = FILENAME_ER_RE.exec(base);
    if (!m) continue;
    const [, code, session, yy] = m;
    if (code !== subjectDef.code) continue;
    const key = `${session}${yy}`;
    if (!byKey.has(key)) byKey.set(key, filePath);
  }
  const reports = [];
  for (const [key, erPath] of byKey) {
    const session = key[0];
    const yy = key.slice(1);
    const year = Number(yy) >= 90 ? 1900 + Number(yy) : 2000 + Number(yy);
    reports.push({
      board: "IGCSE",
      subject: subjectDef.subject,
      component: "Examiner Report",
      year,
      session: sessionLabel(session),
      paperId: `${subjectDef.code}_${session}${yy}_er`,
      title: `CAIE IGCSE ${subjectDef.subject} ${sessionLabel(session)} ${year} Examiner Report`,
      erPath,
    });
  }
  reports.sort((a, b) => a.year - b.year || a.session.localeCompare(b.session));
  return reports;
}

// ZNotes (TKT-0253, 2026-09-18): a static, per-subject revision-notes
// document -- NOT tied to any year/session/variant at all, unlike every
// other component above. Sourced exclusively from papacambridge.com per
// explicit user instruction (not znotes.org's current site, which the
// user says has gotten worse) -- every path below was individually
// confirmed to exist AND visually verified (rendered cover page) to be
// the real, correct document before being hardcoded here, not guessed.
// "Component level" here means matching each subject's own real exam-
// component split (Theory vs Alternative-to-Practical for the sciences,
// or the 6 separate unit files -- P1/P3/M1/M2/S1/S2 -- ZNotes itself
// publishes for A-Level Maths; there's no separate P2 file even on
// ZNotes's own site, not an omission on this end). A plain filename-
// pattern scan (like FILENAME_ER_RE above) doesn't work here: real local
// copies are inconsistently named -- some keep the original "-znotes"
// suffix, some were renamed at some point (e.g. A-Level Physics's own
// A2 theory file has no "znote" anywhere in its name) -- confirmed by
// rendering cover pages during the Update 37 survey, not assumed.
// IGCSE English (0510) has NO entry at all: confirmed via direct
// papacambridge lookup that no ZNotes document exists anywhere for that
// syllabus (only an unrelated official Cambridge learner guide) --
// this is a real absence, not a missed file.
const ZNOTES_FILES = {
  "IGCSE|Physics": [
    { component: "Theory", path: "IGCSE/Physics/Notes/cie-igcse-physics-0625-theory-v4-znotes.pdf" },
    { component: "Alternative to Practical", path: "IGCSE/Physics/Notes/cie-igcse-physics-0625-atp-v2-znotes.pdf" },
  ],
  "IGCSE|Chemistry": [
    { component: "Theory", path: "IGCSE/Chemistry/Content/Notes/cie-igcse-chemistry-0620-theory-v2-znotes.pdf" },
    { component: "Alternative to Practical", path: "IGCSE/Chemistry/Content/Notes/cie-igcse-chemistry-0620-atp-v1-znotes.pdf" },
  ],
  "IGCSE|Biology": [
    { component: "Theory", path: "IGCSE/Biology/Notes/cie-igcse-biology-0610-theory-v2-znotes.pdf" },
    { component: "Alternative to Practical", path: "IGCSE/Biology/Notes/cie-igcse-biology-0610-atp-v2-znotes.pdf" },
  ],
  "IGCSE|Mathematics": [
    { component: "Notes", path: "IGCSE/Maths/Notes/cie-igcse-maths-0580-v3-znotes.pdf" },
  ],
  "A Levels|Physics": [
    { component: "AS Theory", path: "A Levels/Physics/Notes/misc/cie-as-physics-9702-theory-v1-znotes.pdf" },
    { component: "AS Practical", path: "A Levels/Physics/Notes/cie-as-physics-9702-practical-v2-znotes.pdf" },
    { component: "A2 Theory", path: "A Levels/Physics/Notes/caie-a2-physics-9702-theory.pdf" },
    { component: "A2 Practical", path: "A Levels/Physics/Notes/cie-a2-physics-9702-practical-v3-znotes.pdf" },
  ],
  "A Levels|Chemistry": [
    { component: "AS Theory", path: "A Levels/Chemistry/Notes/caie-as-chemistry-9701-theory.pdf" },
    { component: "AS Practical", path: "A Levels/Chemistry/Notes/caie-as-chemistry-9701-practical.pdf" },
    { component: "A2 Theory", path: "A Levels/Chemistry/Notes/caie-a2-chemistry-9701-theory.pdf" },
    { component: "A2 Practical", path: "A Levels/Chemistry/Notes/caie-a2-chemistry-9701-practical.pdf" },
  ],
  "A Levels|Biology": [
    { component: "AS Theory", path: "A Levels/Biology/caie-as-level-biology-9700-theory-v2.pdf" },
    { component: "AS Practical", path: "A Levels/Biology/cie-as-biology-9700-practical-v1-znotes.pdf" },
    { component: "A2 Theory", path: "A Levels/Biology/cie-a2-biology-9700-theory-v1-znotes.pdf" },
    { component: "A2 Practical", path: "A Levels/Biology/cie-a2-biology-9700-practical-v1-znotes.pdf" },
  ],
  "A Levels|Mathematics": [
    { component: "Pure 1", path: "A Levels/Maths/Notes/caie-as-maths-9709-pure-1_Redacted.pdf" },
    { component: "Pure 3", path: "A Levels/Maths/Notes/caie-a2-maths-9709-pure-3.pdf" },
    { component: "Mechanics 1", path: "A Levels/Maths/Notes/caie-as-maths-9709-mechanics.pdf" },
    { component: "Mechanics 2", path: "A Levels/Maths/Notes/cie-a2-maths-9709-mechanics2-v2-znotes.pdf" },
    { component: "Statistics 1", path: "A Levels/Maths/Notes/caie-as-maths-9709-statistics-1.pdf" },
    { component: "Statistics 2", path: "A Levels/Maths/Notes/cie-a2-maths-9709-statistics2-v2-znotes.pdf" },
  ],
  // Named "English Language" (not bare "English") to avoid colliding
  // with the topical library's real, DIFFERENT A-Level subject "English
  // General Paper" (confirmed via a live /api/library check) -- these are
  // two genuinely different real Cambridge syllabuses, not a naming
  // inconsistency to reconcile.
  "A Levels|English Language": [
    { component: "AS Language", path: "A Levels/sas/cie-as-englishlanguage-9093-v1-znotes.pdf" },
  ],
};
// ARCHIVE_ROOT is "/mnt/e/CIE/IGCSE" (see top of file) -- ZNotes paths
// above need the real archive root ONE level up, since they span both
// IGCSE and A Levels.
const CIE_ROOT = path.join(ARCHIVE_ROOT, "..");
// Sample Response / Example Candidate Responses (ECR) -- same static,
// no-year/session shape as ZNotes above, sourced from the local E: drive
// archive. Scoped to v1 (2026-09-25) to the clean single-PDF-per-paper
// sets only -- Biology/Chemistry IGCSE and A-Level Physics also have
// "iECR" sets (one PDF per individual question, 19-21+ files each),
// deliberately left out of this first pass as a different shape needing
// its own per-question wiring, not an oversight.
const SAMPLE_RESPONSE_FILES = {
  "IGCSE|Physics": [
    { component: "Paper 4: Theory (Extended)", path: "IGCSE/Physics/past papers/0625_Example_Candidate_Responses_Paper_4_(for_examination_from_2016).pdf" },
  ],
  "IGCSE|First Language English": [
    { component: "Paper 1: Reading", path: "IGCSE/FLE/0500_Example_Candidate_Responses_Paper_1_(for_examination_from_2020).pdf" },
    { component: "Paper 2: Directed Writing and Composition", path: "IGCSE/FLE/0500_Example_Candidate_Responses_Paper_2_(for_examination_from_2020).pdf" },
  ],
  "A Levels|Physics": [
    { component: "Paper 2: AS Level Structured Questions", path: "A Levels/Physics/Past Papers/other resources/ECR_AS-AL_Physics_9702_P2_v1.pdf" },
    { component: "Paper 3: Advanced Practical Skills (A Level)", path: "A Levels/Physics/Past Papers/other resources/ECR_AS-AL_Physics_9702_P3_v1.pdf" },
    { component: "Paper 4: A Level Structured Questions (A Level)", path: "A Levels/Physics/Past Papers/other resources/ECR_AS-AL_Physics_9702_P4_v1.pdf" },
    { component: "Paper 5: Planning, Analysis and Evaluation (A Level)", path: "A Levels/Physics/Past Papers/other resources/ECR_AS-AL_Physics_9702_P5_v1.pdf" },
  ],
  "A Levels|Mathematics": [
    { component: "Paper 1: Pure Mathematics 1", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper1_ECR_v1.pdf" },
    { component: "Paper 2: Pure Mathematics 2", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper2_ECR_v1.pdf" },
    { component: "Paper 3: Pure Mathematics 3", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper3_ECR_v1.pdf" },
    { component: "Paper 4: Mechanics", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper4_ECR_v1.pdf" },
    { component: "Paper 5: Probability & Statistics 1", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper5_ECR_v1.pdf" },
    { component: "Paper 6: Probability & Statistics 2", path: "A Levels/Maths/9709 Past Papers Categorised/9709_Mathematics_Paper6_ECR_v1.pdf" },
  ],
  "A Levels|English Language": [
    { component: "AS Language", path: "A Levels/English Lang/9093_English_Language_Example_Candidate_Responses_Booklet_2015.pdf" },
  ],
  "A Levels|Literature in English": [
    { component: "Paper 2: Prose and Unseen (AS Level)", path: "A Levels/English Literature/Paper_2_Example_Candidate_Responses.pdf" },
  ],
};

// iECR (interactive, per-question) sets -- unlike SAMPLE_RESPONSE_FILES
// above, these are folders of one PDF per question that need merging into
// one combined document per paper before they fit the same "one static
// document per component" shape as everything else here. Merged output is
// cached under data/mcq-digitizer/yearly-library/merged-ecr/ (gitignored,
// like every other data/ output) and only rebuilt when a source folder's
// newest file is newer than the cached merge.
const IECR_FOLDERS = {
  "IGCSE|Biology": {
    root: "IGCSE/Biology/0610_iECRs",
    pattern: /^0610_IECR_P(\d+)_Q(\d+)_v\d+\.pdf$/i,
    paperToComponent: { 3: "Paper 3: Theory (Core)", 4: "Paper 4: Theory (Extended)", 5: "Paper 5: Practical Test", 6: "Paper 6: Alternative to Practical" },
  },
  "IGCSE|Chemistry": {
    root: "IGCSE/Chemistry/0620_iECRs",
    pattern: /^0620_P(\d+)_Q(\d+)_v\d+\.pdf$/i,
    paperToComponent: { 3: "Paper 3: Theory (Core)", 4: "Paper 4: Theory (Extended)", 5: "Paper 5: Practical Test", 6: "Paper 6: Alternative to Practical" },
  },
  // A Levels|Physics deliberately has NO entry here: SAMPLE_RESPONSE_FILES
  // above already covers it with the official single-PDF ECR booklets
  // (ECR_AS-AL_Physics_9702_P2-5_v1.pdf), which are complete documents;
  // the iECR folder only has a partial subset of questions per paper
  // (e.g. Paper 2: Q1/4/5/7 only, not the full set) and would just add a
  // strictly worse duplicate under the same component name.
};
const MERGED_ECR_DIR = path.join(process.cwd(), "..", "..", "data", "mcq-digitizer", "yearly-library", "merged-ecr");

function listIecrFiles(def) {
  const dir = path.join(CIE_ROOT, def.root);
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const scan = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (fs.statSync(full).isDirectory()) { if (def.nested) scan(full); continue; }
      const m = def.pattern.exec(name);
      if (m) files.push({ full, paper: Number(m[1]), question: Number(m[2]) });
    }
  };
  scan(dir);
  return files;
}

function crawlIecr(board, subject) {
  const def = IECR_FOLDERS[`${board}|${subject}`];
  if (!def) return [];
  const files = listIecrFiles(def);
  if (files.length === 0) return [];
  const byPaper = new Map();
  for (const f of files) {
    if (!byPaper.has(f.paper)) byPaper.set(f.paper, []);
    byPaper.get(f.paper).push(f);
  }
  const docs = [];
  fs.mkdirSync(MERGED_ECR_DIR, { recursive: true });
  for (const [paperNum, list] of byPaper) {
    const component = def.paperToComponent[paperNum];
    if (!component) continue; // an unmapped paper number in the folder -- skip rather than guess a component name
    list.sort((a, b) => a.question - b.question);
    const newestSourceMtime = Math.max(...list.map((f) => fs.statSync(f.full).mtimeMs));
    const outPath = path.join(MERGED_ECR_DIR, `${board.replace(/\s+/g, "")}_${subject.replace(/\s+/g, "")}_P${paperNum}.pdf`);
    const needsRebuild = !fs.existsSync(outPath) || fs.statSync(outPath).mtimeMs < newestSourceMtime;
    if (needsRebuild) {
      const res = spawnSync("python3", [path.join(process.cwd(), "merge_iecr.py"), outPath, ...list.map((f) => f.full)], { encoding: "utf8" });
      if (res.status !== 0) { console.log(`iECR merge failed for ${board} ${subject} Paper ${paperNum}: ${res.stderr}`); continue; }
    }
    docs.push({
      board,
      subject,
      component: `Sample Response: ${component}`,
      title: `Sample Response -- ${subject} ${component} (${list.length} questions)`,
      paperId: `sampleresponse_${board.replace(/\s+/g, "")}_${subject.replace(/\s+/g, "")}_P${paperNum}`,
      sampleResponsePath: outPath,
    });
  }
  return docs;
}

function crawlSampleResponses(board, subject) {
  const entries = SAMPLE_RESPONSE_FILES[`${board}|${subject}`];
  if (!entries) return [];
  const docs = [];
  for (const { component, path: relPath } of entries) {
    const fullPath = path.join(CIE_ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue; // confirmed present at survey time; skip rather than crash if the archive changes later
    docs.push({
      board,
      subject,
      component: `Sample Response: ${component}`,
      title: `Sample Response -- ${subject} ${component}`,
      paperId: `sampleresponse_${board.replace(/\s+/g, "")}_${subject.replace(/\s+/g, "")}_${component.replace(/\s+/g, "")}`,
      sampleResponsePath: fullPath,
    });
  }
  return docs;
}


function crawlZNotes(board, subject) {
  const entries = ZNOTES_FILES[`${board}|${subject}`];
  if (!entries) return [];
  const notes = [];
  for (const { component, path: relPath } of entries) {
    const fullPath = path.join(CIE_ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue; // confirmed present at survey time; skip rather than crash if the archive changes later
    notes.push({
      board,
      subject,
      component: `ZNotes: ${component}`,
      title: `ZNotes -- ${subject} ${component}`,
      paperId: `znotes_${board.replace(/\s+/g, "")}_${subject.replace(/\s+/g, "")}_${component.replace(/\s+/g, "")}`,
      znotesPath: fullPath,
    });
  }
  return notes;
}

// Nested under "IGCSE" (all 5 subjects here are IGCSE-only) to match the
// existing topical library's board->subject->component->[papers] shape --
// lets the Next.js proxy's existing enrollment filter (built for that
// shape) work on this data completely unchanged, and lets the picker UI
// reuse the same board/subject selection pattern.
const result = { IGCSE: {} };
for (const subjectDef of SUBJECTS) {
  const papers = crawlSubject(subjectDef);
  const reports = crawlExaminerReports(subjectDef);
  result.IGCSE[subjectDef.subject] = {};
  for (const p of papers) {
    result.IGCSE[subjectDef.subject][p.component] = result.IGCSE[subjectDef.subject][p.component] || [];
    result.IGCSE[subjectDef.subject][p.component].push(p);
  }
  if (reports.length > 0) {
    result.IGCSE[subjectDef.subject]["Examiner Report"] = reports;
  }
  console.log(`${subjectDef.subject}: ${papers.length} real qp+ms pairs found, ${reports.length} examiner reports found`);
}

// ZNotes is wired in separately from the qp/ms exam-paper crawl above --
// it doesn't need a real qp/ms pair crawl to exist for a subject/board at
// all (A Levels has no yearly qp/ms crawler yet, only ZNotes), so this
// loop covers every (board, subject) key in ZNOTES_FILES directly rather
// than piggybacking on the IGCSE-only SUBJECTS array.
for (const key of Object.keys(ZNOTES_FILES)) {
  const [board, subject] = key.split("|");
  const notes = crawlZNotes(board, subject);
  if (notes.length === 0) continue;
  result[board] = result[board] || {};
  result[board][subject] = result[board][subject] || {};
  // Each note already carries its own distinct component name (e.g.
  // "ZNotes: Theory" vs "ZNotes: Mechanics 2") -- group by that, the same
  // way the main qp/ms crawl above groups papers by p.component, so the
  // picker's Component dropdown shows each one as a separate real choice
  // instead of collapsing every ZNotes document for a subject into one
  // mixed list.
  for (const note of notes) {
    result[board][subject][note.component] = result[board][subject][note.component] || [];
    result[board][subject][note.component].push(note);
  }
  console.log(`${board} ${subject}: ${notes.length} ZNotes file(s) found`);
}

// Sample Response is wired in the same standalone way as ZNotes above --
// its own key set (SAMPLE_RESPONSE_FILES), not piggybacked on any qp/ms
// crawl, since some of these subjects (English Language, Literature) have
// no yearly qp/ms crawler at all.
for (const key of Object.keys(SAMPLE_RESPONSE_FILES)) {
  const [board, subject] = key.split("|");
  const docs = crawlSampleResponses(board, subject);
  if (docs.length === 0) continue;
  result[board] = result[board] || {};
  result[board][subject] = result[board][subject] || {};
  for (const doc of docs) {
    result[board][subject][doc.component] = result[board][subject][doc.component] || [];
    result[board][subject][doc.component].push(doc);
  }
  console.log(`${board} ${subject}: ${docs.length} Sample Response file(s) found`);
}

// iECR sets merge into the same "Sample Response: <component>" shape --
// a subject present in BOTH registries (none currently overlap) would
// have its per-component arrays simply extended, not overwritten.
for (const key of Object.keys(IECR_FOLDERS)) {
  const [board, subject] = key.split("|");
  const docs = crawlIecr(board, subject);
  if (docs.length === 0) continue;
  result[board] = result[board] || {};
  result[board][subject] = result[board][subject] || {};
  for (const doc of docs) {
    result[board][subject][doc.component] = result[board][subject][doc.component] || [];
    result[board][subject][doc.component].push(doc);
  }
  console.log(`${board} ${subject}: ${docs.length} merged iECR Sample Response file(s) found`);
}

const outPath = path.join(process.cwd(), "..", "..", "data", "mcq-digitizer", "yearly-library", "yearly-papers.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${outPath}`);

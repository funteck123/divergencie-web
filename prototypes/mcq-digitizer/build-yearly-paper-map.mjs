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

const ARCHIVE_ROOT = "/mnt/e/CIE/IGCSE";

// Real CAIE filename convention, uniform across all 5 subjects despite
// each one's inconsistent folder placement:
//   {subjectCode}_{session}{yy}_{qp|ms}_{variant}.pdf
// session: s = May/June, w = Oct/Nov, m = Feb/March.
// variant: first digit is the paper NUMBER (matches the app's existing
// SUBJECT_COMPONENTS labels already used for the topical library -- no
// new mapping invented here, just reused).
const FILENAME_RE = /^(\d{4})_([smw])(\d{2})_(qp|ms)_(\d)(\d)\.pdf$/i;

// Extended-tier only (variant first digit even = Extended for sciences,
// matches the existing topical library's own scope -- see plan's
// "Explicitly deferred" section, Core tier is a later decision, not
// silently included here).
const SCIENCE_COMPONENT_BY_DIGIT = {
  "2": "MCQ",
  "4": "Paper 4: Theory (Extended)",
  "6": "Paper 6: Alternative to Practical",
};
const MATHS_COMPONENT_BY_DIGIT = {
  "2": "Paper 2: Non-calculator (Extended)",
  "4": "Paper 4: Calculator (Extended)",
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
    // English component mapping is NOT confirmed yet (per the plan's
    // "Explicitly deferred" list) -- labeled generically as "Paper N"
    // rather than guessing a real CAIE component name that could be
    // wrong. Fix this before shipping the English picker option.
    code: "0510", subject: "English", componentByDigit: null,
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
    papers.push({
      board: "IGCSE",
      subject: subjectDef.subject,
      component,
      year,
      session: sessionLabel(entry.session),
      variant: `${entry.paperDigit}${entry.variantDigit}`,
      title: `CAIE IGCSE ${subjectDef.subject} ${sessionLabel(entry.session)} ${year} Paper ${entry.paperDigit}${entry.variantDigit}`,
      qpPath: entry.qpPath,
      msPath: entry.msPath,
    });
  }
  papers.sort((a, b) => a.year - b.year || a.session.localeCompare(b.session) || a.variant.localeCompare(b.variant));
  return papers;
}

const result = {};
for (const subjectDef of SUBJECTS) {
  const papers = crawlSubject(subjectDef);
  result[subjectDef.subject] = papers;
  console.log(`${subjectDef.subject}: ${papers.length} real qp+ms pairs found`);
}

const outPath = path.join(process.cwd(), "..", "..", "data", "mcq-digitizer", "yearly-library", "yearly-papers.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${outPath}`);

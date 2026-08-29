// Standalone server for the mcq-digitizer prototype -- no framework, no
// LLM, no API key anywhere in this tool. MCQ grading needs zero judgment
// (a selected letter either matches the answer key or it doesn't), so
// this whole tool is deterministic PyMuPDF + regex, start to finish --
// unlike exam-grader/quiz-digitizer, there is no reliability/cost
// tradeoff to manage here at all.
//
// Three endpoints:
//   POST /api/digitize            -- manual upload: QP+MS PDFs as base64.
//   GET  /api/library             -- the pre-built Drive file map
//                                     (data/mcq-digitizer/drive-map/drive-map.json,
//                                     built by a one-time crawl, NOT a live
//                                     Google Drive API/MCP call from this
//                                     server), reshaped into QP/MS pairs
//                                     per subject/category for a picker UI.
//   POST /api/fetch-and-digitize  -- library flow: given one paper's
//                                     {qpId, msId} from /api/library,
//                                     serves it straight from the
//                                     pre-built full-library database
//                                     (data/mcq-digitizer/full-library/
//                                     database.json + saved crop images)
//                                     when it's already there -- instant,
//                                     and carries every answer the
//                                     offline Gemini/lightweight fallback
//                                     chain resolved. Only a paper NOT in
//                                     that database (a real download/
//                                     pairing failure) falls back to
//                                     downloading the two PDFs live by
//                                     their public Drive link (a plain
//                                     HTTPS GET, not Drive API access)
//                                     and digitizing them the same way as
//                                     a manual upload.
//
// Grading itself happens entirely client-side in index.html: since
// there's no LLM involved, there's no reason to round-trip to the server
// for something as simple as "does the selected letter match
// correctAnswer" -- the digitized quiz (images shown, correct answers
// withheld from the UI but present in the JS data) is graded instantly,
// in the browser, the moment Submit is clicked.
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5178;
const REPO_ROOT = path.join(__dirname, "..", "..");
const DRIVE_MAP_PATH = path.join(REPO_ROOT, "data", "mcq-digitizer", "drive-map", "drive-map.json");
const ANSWER_CACHE_PATH = path.join(REPO_ROOT, "data", "mcq-digitizer", "answer-cache", "cache.json");
const DATABASE_PATH = path.join(REPO_ROOT, "data", "mcq-digitizer", "full-library", "database.json");

class PayloadTooLargeError extends Error {}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      // A real adversarial test (>40MB body) showed the old req.destroy()
      // here killing the underlying socket before any response could be
      // written -- the client just saw a connection reset, not a clean
      // error. Just stop accumulating and let the request drain normally
      // so the outer handler can still write a proper 413 response.
      if (tooLarge) return;
      data += chunk;
      if (data.length > 40 * 1024 * 1024) {
        tooLarge = true;
        reject(new PayloadTooLargeError("Request body too large (40MB limit)."));
      }
    });
    req.on("end", () => {
      if (!tooLarge) resolve(data);
    });
    req.on("error", reject);
  });
}

class InvalidPdfError extends Error {}

async function digitizeFromPaths(qpPath, msPath) {
  // Default maxBuffer (1MB) isn't enough once a response embeds a
  // cropped PNG per question -- a real 40-question paper's output runs
  // several times that. 64MB comfortably covers any real paper without
  // being an unbounded allowance.
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      "python3", [path.join(__dirname, "extract_mcq.py"), qpPath, msPath],
      { maxBuffer: 64 * 1024 * 1024 },
    ));
  } catch (e) {
    // A real adversarial test (non-PDF bytes sent as qpBase64/msBase64)
    // showed this leaking a full Python traceback -- including local
    // filesystem paths -- straight into the HTTP response. PyMuPDF's own
    // "FileDataError...Failed to open file...as type pdf" is the one
    // recognizable signature for "this wasn't a real PDF" (a genuine
    // client mistake); anything else is an unexpected parser failure and
    // stays a generic message rather than exposing internals either way.
    const stderr = e.stderr || e.message || "";
    if (stderr.includes("FileDataError") || stderr.includes("Failed to open file")) {
      throw new InvalidPdfError("One or both uploaded files could not be read as a PDF.");
    }
    throw new Error("Failed to process the uploaded PDFs.");
  }
  return JSON.parse(stdout);
}

async function digitizeFromBase64(qpBase64, msBase64) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcq-digitizer-"));
  const qpPath = path.join(tmpDir, "qp.pdf");
  const msPath = path.join(tmpDir, "ms.pdf");
  fs.writeFileSync(qpPath, Buffer.from(qpBase64, "base64"));
  fs.writeFileSync(msPath, Buffer.from(msBase64, "base64"));
  try {
    return await digitizeFromPaths(qpPath, msPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function downloadDriveFile(fileId) {
  const res = await fetch(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Drive download failed for ${fileId}: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  // A file large enough to trip Drive's virus-scan interstitial (or any
  // sign-in wall) comes back as an HTML page, not a PDF -- fail loudly
  // rather than hand extract_mcq.py garbage to choke on silently.
  if (contentType.includes("text/html") || buf.slice(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`File ${fileId} did not download as a PDF (got ${contentType || "unknown content-type"}) -- it may be too large for a direct link or need Drive sign-in.`);
  }
  return buf;
}

// Some real MS files (savemyexams-sourced) present their explanation as
// a designed infographic image (colored callout boxes, a green
// checkmark/red X icon per option) with NO text layer at all -- this
// tool's own no-LLM/no-OCR text parsing correctly can't read those, and
// correctly reports them ambiguous rather than guess. For library-
// sourced papers only, a SEPARATE offline batch process
// (answer_resolver/resolve_ambiguous.py) pre-resolves as many of those
// as it can -- first via pure icon-color detection (no LLM), falling
// back to an LLM (Gemini) reading a batch of pages only for whatever the
// no-LLM pass can't -- and writes the results to a small local cache
// file. This function only ever READS that pre-built cache; it makes no
// LLM call itself and the manual-upload path (digitizeFromBase64) never
// consults it at all, since it has no msId to key on.
function loadAnswerCache(msId) {
  try {
    const cache = JSON.parse(fs.readFileSync(ANSWER_CACHE_PATH, "utf8"));
    return cache[msId] || null;
  } catch {
    return null;
  }
}

function applyAnswerCache(result, msId) {
  const entry = loadAnswerCache(msId);
  if (!entry) return result;
  for (const q of result.questions) {
    if (q.correctAnswer) continue;
    const cached = entry[q.questionNumber];
    if (cached && cached.answer) {
      q.correctAnswer = cached.answer;
      q.correctAnswerSource = cached.source;
    }
  }
  result.unmatchedAnswerKey = result.questions
    .filter((q) => !q.correctAnswer)
    .map((q) => q.questionNumber)
    .filter((n) => result.unmatchedAnswerKey.includes(n));
  result.ambiguousAnswerKey = result.ambiguousAnswerKey.filter(
    (n) => !result.questions.find((q) => q.questionNumber === n && q.correctAnswer)
  );
  return result;
}

// The full-library rebuild (answer_resolver/build_full_database.py)
// already downloaded, cropped, and resolved every paper it could reach
// -- including a slow batched-Gemini pass this live request path has no
// business repeating on every single page load. Serving a paper already
// in database.json straight from disk is both much faster (no Drive
// download, no PyMuPDF re-render, no LLM call) AND more complete: it
// carries every answer the offline Gemini/lightweight fallback chain
// resolved, not just what plain MS text-parsing plus the answer-cache
// can find live. Only papers NOT in the database (the ~10 real
// download/pairing failures, confirmed in failures.json) still fall
// through to the live path below.
let databaseCache = null;
let databaseCacheMtime = 0;
function loadDatabase() {
  try {
    const stat = fs.statSync(DATABASE_PATH);
    if (databaseCache && stat.mtimeMs === databaseCacheMtime) return databaseCache;
    databaseCache = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    databaseCacheMtime = stat.mtimeMs;
    return databaseCache;
  } catch {
    return null;
  }
}

function digitizeFromDatabaseEntry(entry) {
  const questions = entry.questions.map((q) => {
    const imgPath = path.join(REPO_ROOT, q.imagePaths[0]);
    const b64 = fs.readFileSync(imgPath).toString("base64");
    return {
      questionNumber: q.questionNumber,
      optionLetters: q.optionLetters,
      image: "data:image/png;base64," + b64,
      correctAnswer: q.correctAnswer,
    };
  });
  return {
    questions,
    unmatchedAnswerKey: questions.filter((q) => !q.correctAnswer).map((q) => q.questionNumber),
    ambiguousAnswerKey: [],
  };
}

async function digitizeFromDriveIds(qpId, msId) {
  const db = loadDatabase();
  const dbEntry = db && db.find((p) => p.qpId === qpId);
  if (dbEntry) {
    return digitizeFromDatabaseEntry(dbEntry);
  }

  const [qpBuf, msBuf] = await Promise.all([downloadDriveFile(qpId), downloadDriveFile(msId)]);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcq-digitizer-"));
  const qpPath = path.join(tmpDir, "qp.pdf");
  const msPath = path.join(tmpDir, "ms.pdf");
  fs.writeFileSync(qpPath, qpBuf);
  fs.writeFileSync(msPath, msBuf);
  try {
    const result = await digitizeFromPaths(qpPath, msPath);
    return applyAnswerCache(result, msId);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// The crawl (study/agent-notes/09-google-drive-without-mcp-method.md)
// writes a raw tree: board -> subject -> category -> "QP"/"MS" -> array
// of {name, id, url}. A QP and its MS share the same filename except for
// the trailing "QP.pdf"/"MS.pdf" token -- that's the pairing key. This
// runs once per /api/library request against a small local JSON file, no
// network call, so no caching layer needed.
// Real Drive data isn't uniformly named -- IGCSE subjects share a QP/MS
// filename except for the trailing "QP"/"MS" token, but A Levels
// Chemistry pairs look like "12-electrolysis_electrode_potentials-qp.pdf"
// vs "12-Electrolysis-Electrode-Potentials-MS-MCQ-Unlocked.pdf" -- no
// shared substring, just the same underlying words in a different order/
// case/separator. Normalizing to a sorted, stopword-filtered token set
// (never stripping digits -- chapter numbers like "11" vs "11.2" are
// exactly the thing that must NOT collapse together) pairs every well-
// formed case. A genuine word-level content mismatch is a separate,
// real, confirmed case of its own -- see findMsMatch's own chapter-prefix
// fallback below for "11.1-redox...qp.pdf" pairing against a real MS
// filed as "11.1-Electrochemistry...MS...pdf", an upstream naming
// inconsistency between the two files, not a typo an exact-match
// normalization could ever bridge on its own.
const NORMALIZE_STOPWORDS = new Set([
  "qp", "ms", "mcq", "unlocked", "ial", "cie", "worksheet", "paper",
  "mark", "scheme", "markscheme", "answer", "answers", "key", "level",
  "alevel", "igcse", "cambridge", "caie", "question", "questions", "pdf",
  // Pairing already happens within one subject's own category folder, so
  // the subject name is redundant for matching -- and a real MS file was
  // found that omits it from its own filename entirely while its QP
  // includes it ("12-Electrolysis...MS...pdf" has no "chemistry" in it
  // at all), which broke an exact token-set match for no real reason.
  "chemistry", "biology", "physics",
]);
function normalizeTitle(name) {
  const tokens = name
    // A real MS file was found versioned as "...MCQ_2-Unlocked.pdf" --
    // that trailing digit is a version marker with no counterpart in
    // its QP's filename at all (not a duplicate of an existing chapter
    // number, an unrelated one), so a plain "mcq" stopword removal
    // still left a stray "2" token breaking the match. Strip the whole
    // "mcq_N"/"mcqN" unit together, before tokenizing.
    .replace(/mcq[_\s]?\d+/gi, " mcq ")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")
    .filter((t) => t && !NORMALIZE_STOPWORDS.has(t))
    // A lone "s" is an apostrophe artifact, not content -- real pairing
    // bug found on real data: one filename spells a chapter "hesss" (no
    // separator) while its actual MS counterpart spells it "hess_s" (an
    // underscore where the apostrophe was), splitting into two tokens
    // "hess"+"s" that never matched "hesss" as one token. Confirmed via
    // the live library: dropping "s" pairs them; nothing else does.
    .filter((t) => t !== "s");
  // A Set, not the raw array -- real pairing bug found on real data: an
  // MS filename versioned as "...MCQ_1-Unlocked.pdf" contributes an
  // extra "1" token beyond what its QP counterpart has (e.g. a chapter
  // already numbered "25.1"), and joining a SORTED ARRAY (not a
  // deduplicated set) produces a different string for one "1" vs two,
  // even though the extra one carries no real content difference.
  return [...new Set(tokens)].sort().join(" ");
}
function displayTitleOf(name) {
  return name.replace(/\s*[-_(]*\s*(QP|MS)\)?\s*\.pdf$/i, "").trim();
}

// Levenshtein-distance ratio (0..1) -- a standalone reimplementation, not
// a port of Python's difflib.SequenceMatcher, but calibrated against the
// exact same real confirmed cases used to pick that side's 0.85 threshold
// so the two stay behaviorally aligned: real near-misses (a stray dedup
// suffix, an apostrophe split two different ways across a QP/MS pair)
// score >=0.85 here too, the closest real distinct-pair collision found
// in the whole corpus still scores well under it.
function levenshteinRatio(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const dist = dp[a.length][b.length];
  return 1 - dist / Math.max(a.length, b.length);
}
const FUZZY_MATCH_THRESHOLD = 0.85;

function chapterPrefix(name) {
  const m = name.match(/^(\d+(?:\.\d+)?)[\s._-]/);
  return m ? m[1] : null;
}

// Two confirmed-real fallback strategies, tried in order, for when the
// exact normalized match above still doesn't find a pair (see
// NORMALIZE_STOPWORDS's own comment for the artifact classes these
// catch): a fuzzy near-miss (an apostrophe squashed differently across
// the two files, e.g. "hesss" vs "hess"+"s" after stopword filtering --
// confirmed real, CAIE IAL Chemistry "8.1 Enthalpy Change & Hess's Law"),
// then a shared leading chapter-number prefix ONLY when exactly one MS
// candidate carries it (confirmed real: "11.1-redox...qp.pdf" pairs
// against a real MS filed under "11.1-Electrochemistry...MS...pdf" --
// a genuine upstream content-labeling inconsistency between the two
// files' names, not a typo; never picked when more than one candidate
// ties, to avoid guessing).
function findMsMatch(qpName, msList, msByKey) {
  const exact = msByKey.get(normalizeTitle(qpName));
  if (exact) return exact;

  const qpNorm = normalizeTitle(qpName);
  let best = null;
  let bestRatio = 0;
  for (const ms of msList) {
    const ratio = levenshteinRatio(qpNorm, normalizeTitle(ms.name));
    if (ratio > bestRatio) { bestRatio = ratio; best = ms; }
  }
  if (best && bestRatio >= FUZZY_MATCH_THRESHOLD) return best;

  const qpPrefix = chapterPrefix(qpName);
  if (qpPrefix) {
    const prefixMatches = msList.filter((ms) => chapterPrefix(ms.name) === qpPrefix);
    if (prefixMatches.length === 1) return prefixMatches[0];
  }
  return null;
}

function buildLibrary() {
  const raw = JSON.parse(fs.readFileSync(DRIVE_MAP_PATH, "utf8"));

  const boards = {};
  for (const [board, subjects] of Object.entries(raw)) {
    boards[board] = {};
    for (const [subject, categories] of Object.entries(subjects)) {
      boards[board][subject] = {};
      for (const [category, files] of Object.entries(categories)) {
        const qpList = files.QP || files.qp || [];
        const msList = files.MS || files.ms || [];
        const msByKey = new Map(msList.map((f) => [normalizeTitle(f.name), f]));
        const papers = qpList.map((qp) => {
          const ms = findMsMatch(qp.name, msList, msByKey);
          return {
            title: displayTitleOf(qp.name),
            qpId: qp.id, qpName: qp.name,
            msId: ms ? ms.id : null, msName: ms ? ms.name : null,
          };
        });
        boards[board][subject][category] = papers;
      }
    }
  }
  return boards;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/digitize") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      // A malformed/empty body is the CLIENT's mistake, not a server
      // failure -- confirmed via a real adversarial test this was
      // falling into the generic catch below and returning 500 with a
      // raw JSON.parse error message, which is both the wrong status
      // code and unnecessary internal detail to expose.
      if (e instanceof PayloadTooLargeError) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request body must be valid JSON." }));
      }
      return;
    }
    try {
      if (!body.qpBase64 || !body.msBase64) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Both a Question Paper and a Mark Scheme PDF are required." }));
        return;
      }
      const result = await digitizeFromBase64(body.qpBase64, body.msBase64);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(e instanceof InvalidPdfError ? 400 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/library") {
    try {
      if (!fs.existsSync(DRIVE_MAP_PATH)) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Drive map not built yet -- data/mcq-digitizer/drive-map/drive-map.json is missing." }));
        return;
      }
      // A real adversarial test (corrupted drive-map.json) proved this
      // ordering fatal: writeHead(200) ran, THEN buildLibrary() threw
      // while being evaluated as the argument to the next line -- the
      // catch below tried writeHead(500) on a response whose headers
      // were already sent, which Node treats as an uncaught
      // ERR_HTTP_HEADERS_SENT and crashes the entire process, not just
      // this one request. Compute the body fully before writing any
      // headers so a failure here never touches the response at all.
      const body = JSON.stringify(buildLibrary());
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/fetch-and-digitize") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request body must be valid JSON." }));
      }
      return;
    }
    try {
      if (!body.qpId || !body.msId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Both qpId and msId are required." }));
        return;
      }
      const result = await digitizeFromDriveIds(body.qpId, body.msId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(e instanceof InvalidPdfError ? 400 : 502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  const filePath = req.url === "/" ? "index.html" : req.url.slice(1);
  const fullPath = path.join(__dirname, filePath);
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fullPath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`mcq-digitizer prototype running at http://localhost:${PORT}`);
});

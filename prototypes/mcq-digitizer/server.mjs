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
//                                     downloads just those two PDFs by
//                                     their public Drive link (a plain
//                                     HTTPS GET, not Drive API access) and
//                                     digitizes them the same way as a
//                                     manual upload.
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
const PORT = process.env.PORT || 5177;
const DRIVE_MAP_PATH = path.join(__dirname, "..", "..", "data", "mcq-digitizer", "drive-map", "drive-map.json");
const ANSWER_CACHE_PATH = path.join(__dirname, "..", "..", "data", "mcq-digitizer", "answer-cache", "cache.json");

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

async function digitizeFromDriveIds(qpId, msId) {
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
// Chemistry pairs look like "11.2-redox-(ial-cie-chemistry)-qp.pdf" vs
// "11.2-Redox-CIE-IAL-Chemistry-MS-MCQ-Unlocked.pdf" -- no shared
// substring, just the same underlying words in a different order/case/
// separator. Normalizing to a sorted, stopword-filtered token set (never
// stripping digits -- chapter numbers like "11" vs "11.2" are exactly
// the thing that must NOT collapse together) pairs every well-formed
// case; a genuine content mismatch (verified on real Chemistry data: some
// QPs use a "11.2" sub-chapter number their MS counterpart doesn't
// repeat) still correctly comes back unpaired rather than being forced.
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
          const ms = msByKey.get(normalizeTitle(qp.name));
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

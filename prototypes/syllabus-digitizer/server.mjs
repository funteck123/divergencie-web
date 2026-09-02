// Standalone server for the syllabus-digitizer prototype -- no framework,
// matching this repo's other digitizer prototypes' own convention
// (deliberately separate from the main Next.js app).
//
// Flow:
//   1. GET /api/syllabi -- lists every PDF in ../syllabus-library/pdfs/,
//      parsed from its own filename convention
//      ({level}-{subject}-{code}-{cycle}.pdf, see that library's README).
//   2. GET /api/syllabi/:filename -- looks the subject up in the pre-built
//      database (data/syllabus-digitizer/database.json, built by
//      build_database.py) -- same pattern as mcq-digitizer's own
//      full-library database: extraction runs once, offline, and the
//      server just serves the finished JSON straight off disk, instant
//      on every click instead of re-parsing a PDF live. Falls back to a
//      live extract_syllabus.py run only for a PDF that was added to the
//      library after the last `python3 build_database.py` -- so a new
//      subject still works immediately, just not instantly, until the
//      database is rebuilt.
//   3. The browser renders the outline as a collapsible topic tree.
//
// No API key needed anywhere in this prototype -- unlike quiz-digitizer /
// mcq-digitizer, there's no grading/answer-resolution step here at all.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import { markTopicCompleted, unmarkTopicCompleted, getProgressForAccount, getAllProgress, getLeaderboard, ProgressUnavailableError } from "./progress.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const PDFS_DIR = path.join(__dirname, "..", "syllabus-library", "pdfs");
const DATABASE_PATH = path.join(REPO_ROOT, "data", "syllabus-digitizer", "database.json");
const IMAGES_DIR = path.join(REPO_ROOT, "data", "syllabus-digitizer", "images");

const PORT = process.env.PORT || 5177;

const FILENAME_RE = /^(igcse|a-level)-(.+?)-(\d{4})-(.+)\.pdf$/;

function titleCase(slug) {
  return slug
    .split("-")
    .map((w) => (w.length <= 3 && w !== "and" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\bIct\b/, "ICT")
    .replace(/\bEsl\b/, "ESL");
}

function listSyllabi() {
  return fs
    .readdirSync(PDFS_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .map((filename) => {
      const m = FILENAME_RE.exec(filename);
      if (!m) return { filename, level: "unknown", subject: filename, code: "", cycle: "" };
      const [, level, subjectSlug, code, cycle] = m;
      return {
        filename,
        level: level === "igcse" ? "IGCSE" : "A Level",
        subject: titleCase(subjectSlug),
        code,
        cycle,
      };
    })
    .sort((a, b) => (a.level + a.subject).localeCompare(b.level + b.subject));
}

// Mtime-checked load, same reasoning as mcq-digitizer's own database
// cache: reading the (small, single-file) JSON straight off disk on every
// request is already instant, but this avoids even the readFileSync/parse
// cost across requests when the file hasn't changed since the last one.
let database = null;
let databaseMtimeMs = 0;

function loadDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) return null;
  const stat = fs.statSync(DATABASE_PATH);
  if (database && stat.mtimeMs === databaseMtimeMs) return database;
  try {
    database = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    databaseMtimeMs = stat.mtimeMs;
  } catch (e) {
    // Real failure mode found red-teaming: a corrupt/half-written
    // database.json (interrupted build, bad disk write) used to throw
    // here uncaught, which took down EVERY subject at once even though
    // only the shared file was bad. Treat a corrupt file as "no database"
    // instead -- every subject still works via the live-extraction
    // fallback below, just without the instant response, until a fresh
    // `build_database.py` run replaces it.
    console.warn(`WARNING: ${DATABASE_PATH} failed to parse (${e.message}) -- falling back to live extraction for every subject until it's rebuilt.`);
    database = null;
  }
  return database;
}

// Caches the in-flight PROMISE, not just the resolved result -- found
// red-teaming: two near-simultaneous requests for the same not-yet-cached
// filename used to each spawn their own python3 subprocess (the cache was
// only populated after the first one finished). Storing the promise
// immediately means the second request just awaits the first one's result.
const liveExtractCache = new Map();

async function extractSyllabusLive(filename) {
  if (liveExtractCache.has(filename)) return liveExtractCache.get(filename);
  const safeName = path.basename(filename);
  const pdfPath = path.join(PDFS_DIR, safeName);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`No such syllabus file: ${safeName}`);
  }
  const promise = execFileAsync("python3", [path.join(__dirname, "extract_syllabus.py"), pdfPath]).then(
    ({ stdout }) => JSON.parse(stdout)
  );
  liveExtractCache.set(filename, promise);
  try {
    return await promise;
  } catch (e) {
    liveExtractCache.delete(filename); // don't cache a failure -- a later retry should get a fresh attempt
    throw e;
  }
}

async function getSyllabus(filename) {
  const db = loadDatabase();
  if (db?.subjects?.[filename]) return db.subjects[filename];
  // Not in the pre-built database yet -- most likely a PDF added to the
  // library after the last `python3 build_database.py` run. Falls back to
  // a live parse so it still works, just without the instant response;
  // rebuild the database to make it permanent.
  return extractSyllabusLive(filename);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/syllabi") {
    try {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(listSyllabi()));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/syllabi/")) {
    try {
      const filename = decodeURIComponent(req.url.slice("/api/syllabi/".length));
      const result = await getSyllabus(filename);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/images/")) {
    // Real PNG files on disk under data/syllabus-digitizer/images/, one
    // real nested folder per Level/Subject/Chapter -- see
    // extract_syllabus.py's attach_images(). Same path-boundary check as
    // the static file server below, since this path segment also comes
    // straight from the URL.
    const relImagePath = decodeURIComponent(req.url.slice("/images/".length));
    const imagePath = path.join(IMAGES_DIR, relImagePath);
    const relCheck = path.relative(IMAGES_DIR, imagePath);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(imagePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" });
      res.end(data);
    });
    return;
  }

  // Topic-completion tracking (progress.mjs) -- mirrors mcq-digitizer's
  // score-tracking endpoints. No accountId means no tracking for that
  // session, not an error -- this tool must keep working standalone for
  // anyone without a link param.
  if (req.method === "POST" && req.url === "/api/topic-complete") {
    try {
      const body = JSON.parse(await readBody(req));
      const { accountId, accountName, subject, nodeKey, nodeLabel, completed } = body;
      if (!accountId || !subject || !nodeKey) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "accountId, subject, and nodeKey are required." }));
        return;
      }
      if (completed === false) {
        await unmarkTopicCompleted({ accountId, subject, nodeKey });
      } else {
        await markTopicCompleted({ accountId, accountName, subject, nodeKey, nodeLabel });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(e instanceof ProgressUnavailableError ? 503 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/progress/all")) {
    try {
      const completions = await getAllProgress();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ completions }));
    } catch (e) {
      res.writeHead(e instanceof ProgressUnavailableError ? 503 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/progress")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const accountId = url.searchParams.get("account");
      if (!accountId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "account query param is required." }));
        return;
      }
      const completions = await getProgressForAccount(accountId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ completions }));
    } catch (e) {
      res.writeHead(e instanceof ProgressUnavailableError ? 503 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/leaderboard") {
    try {
      const leaderboard = await getLeaderboard();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(leaderboard));
    } catch (e) {
      res.writeHead(e instanceof ProgressUnavailableError ? 503 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Pre-existing bug found while adding ?account=/&name= tracking params:
  // this never stripped the query string, so "/?account=X" resolved to
  // the literal filename "?account=X" instead of index.html -- a 404 on
  // the very root path anyone with a tracking link would land on.
  const urlPath = req.url.split("?")[0];
  const filePath = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const fullPath = path.join(__dirname, filePath);
  // path.relative + checking for a leading ".." is the real directory-
  // boundary check -- a plain fullPath.startsWith(__dirname) string
  // comparison (the previous check here) would wrongly allow a sibling
  // directory that happens to share __dirname as a string prefix, e.g.
  // "prototypes/syllabus-digitizer" vs. a future
  // "prototypes/syllabus-digitizerBACKUP". Not currently exploitable (no
  // such sibling exists yet), but found red-teaming as a real latent gap.
  const rel = path.relative(__dirname, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
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
  console.log(`syllabus-digitizer prototype running at http://localhost:${PORT}`);
});

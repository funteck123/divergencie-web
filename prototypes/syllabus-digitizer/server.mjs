// Standalone server for the syllabus-digitizer prototype -- no framework,
// matching this repo's other digitizer prototypes' own convention
// (deliberately separate from the main Next.js app).
//
// Flow:
//   1. GET /api/syllabi -- lists every PDF in ../syllabus-library/pdfs/,
//      parsed from its own filename convention
//      ({level}-{subject}-{code}-{cycle}.pdf, see that library's README).
//   2. GET /api/syllabi/:filename -- shells out to extract_syllabus.py
//      (PyMuPDF text/layout extraction, no LLM call -- this is a
//      structural parsing problem, not a judgment problem) and returns
//      the topic outline as JSON. Results are cached in memory per
//      filename for the life of the server -- the PDFs never change at
//      runtime, so there's no reason to re-run the parse on every click.
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

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = path.join(__dirname, "..", "syllabus-library", "pdfs");

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

const extractCache = new Map();

async function extractSyllabus(filename) {
  if (extractCache.has(filename)) return extractCache.get(filename);
  const safeName = path.basename(filename);
  const pdfPath = path.join(PDFS_DIR, safeName);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`No such syllabus file: ${safeName}`);
  }
  const { stdout } = await execFileAsync("python3", [path.join(__dirname, "extract_syllabus.py"), pdfPath]);
  const result = JSON.parse(stdout);
  extractCache.set(filename, result);
  return result;
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
      const result = await extractSyllabus(filename);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
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
  console.log(`syllabus-digitizer prototype running at http://localhost:${PORT}`);
});

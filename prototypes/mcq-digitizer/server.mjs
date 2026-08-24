// Standalone server for the mcq-digitizer prototype -- no framework, no
// LLM, no API key, no network call anywhere in this tool. MCQ grading
// needs zero judgment (a selected letter either matches the answer key
// or it doesn't), so this whole tool is deterministic PyMuPDF + regex,
// start to finish -- unlike exam-grader/quiz-digitizer, there is no
// reliability/cost tradeoff to manage here at all.
//
// One endpoint: POST /api/digitize, takes a Question Paper PDF AND a
// Mark Scheme PDF (both required -- this tool's whole premise, per
// explicit direction, is that both are always provided together, unlike
// exam-grader's optional generate-MS mode). Shells out to extract_mcq.py,
// which parses the QP's questions+lettered options and the MS's answer
// key, and merges them into one structured quiz with each question's
// correct answer already attached.
//
// Grading itself happens entirely client-side in index.html: since
// there's no LLM involved, there's no reason to round-trip to the server
// for something as simple as "does the selected letter match
// correctAnswer" -- the digitized quiz (options shown, correct answers
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 40 * 1024 * 1024) {
        reject(new Error("request body too large (40MB limit)"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function digitize(qpBase64, msBase64) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcq-digitizer-"));
  const qpPath = path.join(tmpDir, "qp.pdf");
  const msPath = path.join(tmpDir, "ms.pdf");
  fs.writeFileSync(qpPath, Buffer.from(qpBase64, "base64"));
  fs.writeFileSync(msPath, Buffer.from(msBase64, "base64"));
  try {
    const { stdout } = await execFileAsync("python3", [path.join(__dirname, "extract_mcq.py"), qpPath, msPath]);
    return JSON.parse(stdout);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/digitize") {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.qpBase64 || !body.msBase64) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Both a Question Paper and a Mark Scheme PDF are required." }));
        return;
      }
      const result = await digitize(body.qpBase64, body.msBase64);
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
  console.log(`mcq-digitizer prototype running at http://localhost:${PORT}`);
});

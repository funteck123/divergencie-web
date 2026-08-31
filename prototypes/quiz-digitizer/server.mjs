// Standalone server for the quiz-digitizer prototype -- no framework,
// matching the exam-grader prototype's own convention (deliberately
// separate from the main Next.js app).
//
// Flow:
//   1. POST /api/digitize -- upload a Question Paper PDF. Server shells
//      out to extract_questions.py (PyMuPDF text/layout extraction +
//      regex heuristics), which finds question/sub-part boundaries
//      WITHOUT any LLM call -- explicit direction: segmentation should be
//      free, instant, and deterministic. Grading is a genuinely different
//      job (judging correctness needs understanding; finding where a
//      question starts/ends is a text/layout problem), so it's the only
//      step that still calls a model. Returns a flat list of quiz items.
//   2. The browser renders those items as an interactive quiz -- one
//      text-answer box per item -- and the user answers them live.
//   3. POST /api/submit -- the original quiz items + an (optional) Mark
//      Scheme + the student's typed answers get graded in one LLM call.
//      Returns marks, verdicts, and the correct answer for every item so
//      mistakes can be shown clearly at the end.
//
// Requires OPENROUTER_API_KEY (own .env file or environment) for the
// grading step only -- /api/digitize needs no API key at all.
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const PORT = process.env.PORT || 5176;
// Two models, picked per-request based on whether it actually contains an
// image (see pickModel() below) -- real finding from testing: free
// VISION models on OpenRouter are unreliable (~40% clean success across
// 15 real test calls, see README's full history), but a free TEXT-only
// model tested 15/15 (100%) clean on the same kind of structured-JSON
// task, and ~15x faster (~1.4s vs 20-60s+). Most quiz-digitizer grading
// calls have no image at all (digitize is already text-only; student
// answers are typed) -- exam-grader still needs vision whenever the
// script/QP/MS is an uploaded image, so it falls back to the vision
// router only when a request actually contains one.
const TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
const VISION_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS) || 8000;

function pickModel(content) {
  const hasImage = Array.isArray(content) && content.some((block) => block.type === "image_url");
  return hasImage ? VISION_MODEL : TEXT_MODEL;
}

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

async function callOpenRouter(systemPrompt, content) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Put it in prototypes/quiz-digitizer/.env or export it.");
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5176",
      "X-Title": "DivergenCIE Quiz Digitizer Prototype",
    },
    body: JSON.stringify({
      model: pickModel(content),
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenRouter API error (${res.status}): ${data?.error?.message || JSON.stringify(data)}`);
  }
  const rawText = data.choices?.[0]?.message?.content || "";
  const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Real failure mode found switching to openrouter/free (an
    // auto-router across many free models): some of them dump raw
    // chain-of-thought text directly into the `content` field instead of
    // keeping it in the separate `reasoning` field where it belongs --
    // e.g. content starting "We need to produce JSON with..." or "Here's
    // a thinking process:...". A plain markdown-fence strip doesn't help
    // since there's no fence, just prose before the real JSON object.
    // Fallback: find the actual {...} object embedded in the text (first
    // "{" to its matching last "}") and try parsing just that.
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(rawText.slice(start, end + 1));
      } catch {
        // Fall through to the original error below -- the embedded
        // substring wasn't valid JSON either.
      }
    }
    throw new Error(`Model response was not valid JSON: ${e.message}\n\nRaw response:\n${rawText.slice(0, 2000)}`);
  }
}

// Finds question boundaries via PyMuPDF text/layout extraction + regex
// heuristics (extract_questions.py) -- NO LLM call, per explicit
// direction. See that file's own header comment for the real, honest
// tradeoff: this covers common numbered-question/lettered-sub-part
// conventions, not universal understanding of arbitrary layouts the way
// a vision model would give. No API key needed for this step at all,
// and it's instant/free regardless of how many pages the PDF has --
// unlike the earlier vision-LLM version of this step, which hit a real,
// hard OpenRouter prompt-token limit on a real 15-page paper
// ("24571 > 6742") and, even after switching to one-page-per-call to fix
// that, still burned real credit per page for a purely mechanical task.
async function digitizeFromPdf(pdfBase64) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quiz-digitizer-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, "base64"));
  try {
    const { stdout } = await execFileAsync("python3", [path.join(__dirname, "extract_questions.py"), pdfPath]);
    return JSON.parse(stdout);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const GRADE_SYSTEM_PROMPT = `You are grading a student's answers to a digitized quiz.
You will be given the quiz's questions (with their marks), an optional Mark Scheme (may be absent
-- if so, use your own subject expertise to judge correctness), and the student's typed answers to
each question, matched by question number.

For every question, decide a verdict (correct / partial / incorrect), how many of the available
marks it earns, specific feedback, and the correct answer (concise, complete enough to actually
teach the point, not just a bare final value if working matters).

Respond with ONLY a single JSON object, no markdown code fences, no commentary:
{
  "totalMarks": <integer>,
  "maxMarks": <integer>,
  "results": [
    {
      "questionNumber": "<string>",
      "studentAnswer": "<the student's answer, as given>",
      "verdict": "correct" | "partial" | "incorrect" | "unanswered",
      "marksAwarded": <integer>,
      "marksAvailable": <integer>,
      "feedback": "<specific feedback>",
      "correctAnswer": "<the correct answer/working>"
    }
  ],
  "overallFeedback": "<2-4 sentences>"
}`;

async function gradeQuiz(questions, ms, answers) {
  const answerLines = questions
    .map((q) => `Q${q.questionNumber}: ${answers[q.questionNumber] ?? "(no answer given)"}`)
    .join("\n");
  const content = [
    { type: "text", text: "--- QUIZ QUESTIONS (with marks) ---" },
    { type: "text", text: JSON.stringify(questions, null, 2) },
  ];
  if (ms?.text?.trim()) {
    content.push({ type: "text", text: "--- MARK SCHEME ---" }, { type: "text", text: ms.text.trim() });
  }
  if (ms?.imageBase64 && ms?.imageMediaType) {
    content.push(
      { type: "text", text: "--- MARK SCHEME (image) ---" },
      { type: "image_url", image_url: { url: `data:${ms.imageMediaType};base64,${ms.imageBase64}` } }
    );
  }
  content.push({ type: "text", text: "--- STUDENT ANSWERS ---" }, { type: "text", text: answerLines });
  content.push({ type: "text", text: "Grade every question now. Respond with only the JSON object described in your instructions." });
  const result = await callOpenRouter(GRADE_SYSTEM_PROMPT, content);

  // Real bug found switching to a free model: its own top-level
  // totalMarks/maxMarks fields were sometimes internally inconsistent
  // with its own per-question results array (e.g. every individual
  // marksAwarded: 0, but totalMarks: 86 anyway) -- confirmed live,
  // reproduced in 2 of 5 identical test calls. The server was blindly
  // trusting the model's own summary fields instead of the ground truth
  // it also returned in the same response. Now recomputed here from the
  // actual per-question numbers, which can't disagree with themselves.
  if (Array.isArray(result.results)) {
    const recomputedTotal = result.results.reduce((sum, r) => sum + (Number(r.marksAwarded) || 0), 0);
    const recomputedMax = result.results.reduce((sum, r) => sum + (Number(r.marksAvailable) || 0), 0);
    if (recomputedTotal !== result.totalMarks || recomputedMax !== result.maxMarks) {
      console.warn(`[submit] model's own totalMarks/maxMarks (${result.totalMarks}/${result.maxMarks}) disagreed with its own per-question results (${recomputedTotal}/${recomputedMax}) -- using the recomputed, self-consistent values`);
    }
    result.totalMarks = recomputedTotal;
    result.maxMarks = recomputedMax;
  }
  return result;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/digitize") {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await digitizeFromPdf(body.pdfBase64);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/submit") {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await gradeQuiz(body.questions, body.ms, body.answers);
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
  console.log(`quiz-digitizer prototype running at http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set -- requests will fail until you set it.");
  }
});

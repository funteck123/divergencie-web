// Minimal standalone server for the exam-grader prototype -- no Express,
// no framework, just Node's built-in http module, matching "simple
// separate html project" (deliberately decoupled from the main Next.js
// app's build/routes/database; this runs entirely on its own via
// `node server.mjs`).
//
// Serves index.html statically and exposes one endpoint,
// POST /api/grade, which calls a vision-capable Claude model with the
// Question Paper, Mark Scheme, and Student Script (each either pasted
// text or an uploaded image, or both) and asks for structured JSON:
// marks + line-by-line corrections/feedback.
//
// Calls the model via OpenRouter (one API, many providers/models) rather
// than a direct Anthropic key -- requires OPENROUTER_API_KEY, either in
// the environment (OPENROUTER_API_KEY=sk-or-... node server.mjs) or in
// this directory's own .env file (gitignored, NOT the main app's .env --
// deliberately separate, this prototype isn't part of the app yet).
// Override the model with OPENROUTER_MODEL if the default slug below
// isn't right for your account/catalog -- OpenRouter's model list changes
// over time and this wasn't live-verified against a real account.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tiny, dependency-free .env loader -- no `dotenv` package needed for
// something this small. Only sets a var if it isn't already set in the
// real environment, so an explicit `OPENROUTER_API_KEY=... node server.mjs`
// still wins over the file.
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

const PORT = process.env.PORT || 5175;
// Two models, picked per-request based on whether it actually contains an
// image -- see pickModel() below and quiz-digitizer/server.mjs's matching
// comment for the full real numbers: free VISION models measured ~40%
// clean success across 15 real test calls, a free TEXT-only model
// measured 15/15 (100%) on the same kind of structured-JSON task and
// ~15x faster. Whenever the QP/MS/Student Script here is pasted text
// only (no uploaded images), this now uses the reliable text model; any
// image anywhere in the request still needs the vision router.
const TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
const VISION_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
// Override if your OpenRouter account's available credit can't cover the
// default -- a real 402 ("requires more credits, or fewer max_tokens")
// was hit live during this build at 8000, confirming this needed to be
// tunable, not hardcoded.
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
      if (data.length > 30 * 1024 * 1024) {
        reject(new Error("request body too large (30MB limit)"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Builds one OpenAI-compatible content-block array (OpenRouter's chat
// completions endpoint speaks the OpenAI format, not Anthropic's native
// Messages format -- images are {type:"image_url", image_url:{url: data-URI}}
// rather than Anthropic's {type:"image", source:{...}}) for a labeled
// input (QP/MS/Script) that may have pasted text, an uploaded image, or
// both -- either is optional per slot except the Student Script, which
// needs at least one.
function inputBlocks(label, input) {
  const blocks = [{ type: "text", text: `--- ${label} ---` }];
  if (input?.text?.trim()) {
    blocks.push({ type: "text", text: input.text.trim() });
  }
  if (input?.imageBase64 && input?.imageMediaType) {
    blocks.push({
      type: "image_url",
      image_url: { url: `data:${input.imageMediaType};base64,${input.imageBase64}` },
    });
  }
  return blocks;
}

const SYSTEM_PROMPT = `You are an experienced exam grader for Cambridge IGCSE/A-Level style papers.
You will be given a Question Paper, a Mark Scheme, and a Student's answer script (each may be
plain text and/or an image -- the script may be handwritten, contain diagrams, or be a mix of
typed and photographed content; read images carefully, including any handwriting or diagrams).

FIRST, before grading anything: check whether the student's script is actually answering THIS
question paper at all. Real, live-confirmed failure case this check exists for: a script and a QP
that were both real trigonometry papers, from the same subject and topic, but were simply two
different worksheets -- the script's questions (bearings between named points, an "acute angle"
calculation, a forest-area problem) did not correspond to any question actually printed in the QP
(a pyramid, a ship/lighthouse bearing problem, a hexagon, a tent, a tower, a cuboid). Grading that
pairing would have produced meaningless output. Set "scriptMatchesQuestionPaper": false whenever
you hit this -- not just for a totally unrelated subject, but for this same "looks similar, isn't
actually the same paper" case too. When you set it false: "totalMarks" MUST be 0, "questions" MUST
be an empty array, and "mismatchRemark" must name specifically what in the script doesn't
correspond to what's in the QP (quote/reference at least one real example from each side) -- never
a vague "doesn't match," always the specific reason you concluded that.

If the script DOES match, set "scriptMatchesQuestionPaper": true, "mismatchRemark": null, and grade
normally: for every question you can identify in the script, work through it line by line -- quote
(or closely paraphrase, if handwriting is hard to read exactly) the relevant piece of the student's
answer, say whether it earns the mark(s) the scheme allows for that point, and if not, explain
exactly what was missing or wrong and what the correct answer/working should have been.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after,
matching exactly this shape:
{
  "scriptMatchesQuestionPaper": <true or false>,
  "mismatchRemark": "<specific reason if false, otherwise null>",
  "maxMarks": <total marks available across the whole question paper, integer>,
  "totalMarks": <total marks actually awarded -- 0 if scriptMatchesQuestionPaper is false, integer>,
  "questions": [
    {
      "questionNumber": "<e.g. '1(a)' or '2'>",
      "marksAvailable": <integer>,
      "marksAwarded": <integer>,
      "lineByLine": [
        {
          "studentText": "<the specific piece of the student's answer this line refers to>",
          "verdict": "correct" | "partial" | "incorrect" | "note",
          "feedback": "<specific, concrete feedback on this exact line>",
          "correction": "<the correct answer/working for this point, or null if the line was already fully correct>"
        }
      ],
      "questionFeedback": "<one short paragraph summarizing this question overall>"
    }
  ],
  "overallFeedback": "<2-4 sentences of overall, specific, actionable feedback on the whole script -- or, if scriptMatchesQuestionPaper is false, a short next-step suggestion (e.g. re-check which QP/script pair was uploaded)>"
}
If scriptMatchesQuestionPaper is true but one individual question in the script can't be matched to
a specific question in the paper/mark scheme, still include it with marksAvailable: 0 and a note in
lineByLine explaining why it couldn't be graded -- that per-question case is different from the
whole-script mismatch check above, don't conflate them.`;

// Generate-MS mode: no real mark scheme was provided, only a Question
// Paper. Asks the model to author a reasonable mark scheme FROM the QP
// alone (expected answer/working + mark allocation per question) before
// grading against it. This is a real limitation worth being upfront about
// in the UI: an inferred mark scheme is not the real official one, and
// mark allocations for "show that"/working-based questions in particular
// are often somewhat arbitrary without the real scheme to check against.
const MS_GENERATION_SYSTEM_PROMPT = `You are an experienced Cambridge IGCSE/A-Level exam writer.
You will be given a Question Paper (text and/or image, possibly a photo/scan). For every question
in it, write a realistic mark scheme: the expected answer/working, and a sensible mark allocation
per part, consistent with any [n] mark annotations printed on the paper itself if present.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after:
{
  "maxMarks": <total marks across the whole paper, integer>,
  "questions": [
    {
      "questionNumber": "<e.g. '1(a)' or '2'>",
      "marksAvailable": <integer>,
      "expectedAnswer": "<the expected answer/working/key points, concise but complete enough to grade against>"
    }
  ]
}`;

async function callOpenRouterRaw(systemPrompt, content) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in the environment. Run: OPENROUTER_API_KEY=sk-or-... node server.mjs");
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Optional, OpenRouter-recommended headers for their own dashboard/
      // leaderboard attribution -- harmless to omit, harmless to include.
      "HTTP-Referer": "http://localhost:5175",
      "X-Title": "DivergenCIE Exam Grader Prototype",
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
  // Strip markdown code fences if the model added them despite instructions
  // not to -- defensive, not assumed to be needed.
  const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Real failure mode found switching to openrouter/free (an
    // auto-router across many free models): some dump raw chain-of-
    // thought text directly into `content` instead of the separate
    // `reasoning` field (e.g. "We need to produce JSON with..."). No
    // markdown fence to strip, just prose before the real JSON object.
    // Fallback: extract the {...} object embedded in the text.
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(rawText.slice(start, end + 1));
      } catch {
        // Embedded substring wasn't valid JSON either -- fall through.
      }
    }
    throw new Error(`Model response was not valid JSON: ${e.message}\n\nRaw response:\n${rawText.slice(0, 2000)}`);
  }
}

async function generateMarkScheme(qp) {
  const content = [
    ...inputBlocks("QUESTION PAPER", qp),
    { type: "text", text: "Write a mark scheme for this question paper now. Respond with only the JSON object described in your instructions." },
  ];
  return callOpenRouterRaw(MS_GENERATION_SYSTEM_PROMPT, content);
}

// Renders a generated mark scheme (structured JSON) into the same plain
// text shape a pasted real mark scheme would take, so it can be fed
// straight into the normal grading prompt via inputBlocks("MARK SCHEME", ...)
// without callOpenRouter needing to know whether the MS was generated or
// pasted -- one grading code path either way.
function markSchemeToText(generatedMs) {
  return generatedMs.questions
    .map((q) => `Question ${q.questionNumber} [${q.marksAvailable} marks]: ${q.expectedAnswer}`)
    .join("\n\n");
}

async function callOpenRouter(qp, ms, script) {
  let msInput = ms;
  let generatedMs = null;
  const hasRealMs = ms?.text?.trim() || (ms?.imageBase64 && ms?.imageMediaType);
  if (!hasRealMs) {
    generatedMs = await generateMarkScheme(qp);
    msInput = { text: markSchemeToText(generatedMs) };
  }

  const content = [
    ...inputBlocks("QUESTION PAPER", qp),
    ...inputBlocks("MARK SCHEME", msInput),
    ...inputBlocks("STUDENT SCRIPT", script),
    { type: "text", text: "Grade the Student Script against the Mark Scheme now. Respond with only the JSON object described in your instructions." },
  ];
  const parsed = await callOpenRouterRaw(SYSTEM_PROMPT, content);
  if (generatedMs) {
    // Flag clearly in the response that this wasn't a real mark scheme --
    // the UI must not present an inferred MS as if it were the official
    // one. See README's "generate-MS mode" section for why this matters.
    parsed.markSchemeWasGenerated = true;
    parsed.generatedMarkSchemeText = markSchemeToText(generatedMs);
  }
  // Same fix as quiz-digitizer/server.mjs: don't trust the model's own
  // top-level totalMarks/maxMarks -- recompute from its own per-question
  // results, which is the actual ground truth in the same response.
  // Real bug found switching to a free model: these two disagreed with
  // each other in real testing (per-question marks summing to 0 while
  // the top-level totalMarks said otherwise).
  if (Array.isArray(parsed.questions) && parsed.scriptMatchesQuestionPaper !== false) {
    const recomputedTotal = parsed.questions.reduce((sum, q) => sum + (Number(q.marksAwarded) || 0), 0);
    const recomputedMax = parsed.questions.reduce((sum, q) => sum + (Number(q.marksAvailable) || 0), 0);
    if (recomputedTotal !== parsed.totalMarks || recomputedMax !== parsed.maxMarks) {
      console.warn(`[grade] model's own totalMarks/maxMarks (${parsed.totalMarks}/${parsed.maxMarks}) disagreed with its own per-question results (${recomputedTotal}/${recomputedMax}) -- using the recomputed, self-consistent values`);
    }
    parsed.totalMarks = recomputedTotal;
    parsed.maxMarks = recomputedMax;
  }
  return parsed;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/grade") {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await callOpenRouter(body.qp, body.ms, body.script);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static file serving, deliberately minimal -- this prototype has
  // exactly one HTML file and no other assets yet.
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
  console.log(`exam-grader prototype running at http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set -- grading requests will fail until you set it.");
  }
});

// Rebuilds the Question Solver's topical worksheet list (data/mcq-digitizer/drive-map/drive-map.json) from the DC Course Materials
// Drive folder, through the Drive API (read only, GOOGLE_DRIVE_API_KEY). The one-time crawl of 2026-09-06 read a web page that
// shows 50 files per folder, so every folder was cut at 50 (A Level Physics Theory: 50 of 125; IGCSE Physics Theory: 50 of 119).
//
//   node --env-file=.env.local scripts/ops/refresh-drive-map.mjs            dry run: prints old and new counts, writes nothing
//   node --env-file=.env.local scripts/ops/refresh-drive-map.mjs --write    backs up the map, then writes it
//   --dump <file>  also writes the new map to that file (for checking it before --write)
//   --include-mcq  also replace the multiple-choice buckets. Left alone by default: new multiple-choice worksheets need the answer-key
//                  rebuild (prototypes/mcq-digitizer/answer_resolver/build_full_database.py) before they are fit to show.
//   add --force to write even when files that were in the old map are gone from Drive
//
// The service reads the map on every /api/library request, so a written map is live at once (no restart).
import fs from "fs";
import path from "path";
import { BUCKETS, DRIVE_SUBJECT_NAME, diffBuckets, isBrokenSplit, pairBaseName } from "../../prototypes/mcq-digitizer/driveMapRules.mjs";

const KEY = process.env.GOOGLE_DRIVE_API_KEY;
const ROOT = "1KZBDpoIOf7KQcxX1Qa63WllHVRXAQb00"; // DC Course Materials
const MAP = path.join(process.cwd(), "data", "mcq-digitizer", "drive-map", "drive-map.json");
const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force");
const INCLUDE_MCQ = process.argv.includes("--include-mcq");
const DUMP = process.argv.includes("--dump") ? process.argv[process.argv.indexOf("--dump") + 1] : "";
const FOLDER = "application/vnd.google-apps.folder";
if (!KEY) { console.error("GOOGLE_DRIVE_API_KEY is not set. Run with: node --env-file=.env.local scripts/ops/refresh-drive-map.mjs"); process.exit(1); }

async function list(folderId) {
  const out = [];
  let token = "";
  do {
    const q = new URLSearchParams({ q: `'${folderId}' in parents and trashed=false`, fields: "nextPageToken,files(id,name,mimeType)", pageSize: "1000", key: KEY });
    if (token) q.set("pageToken", token);
    let data;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${q}`);
        if (!res.ok) throw new Error(`Drive API ${res.status}`);
        data = await res.json();
        break;
      } catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); }
    }
    out.push(...(data.files || []));
    token = data.nextPageToken || "";
  } while (token);
  return out;
}
const childFolder = async (id, name) => (await list(id)).find((f) => f.name === name && f.mimeType === FOLDER)?.id;
const toEntry = (f) => ({ name: f.name, id: f.id, url: `https://drive.google.com/file/d/${f.id}/view` });
const isPdf = (f) => f.mimeType !== FOLDER && /\.pdf$/i.test(f.name);

const old = JSON.parse(fs.readFileSync(MAP, "utf8"));
const next = JSON.parse(JSON.stringify(old));
// question papers already built into the structured database, by file id (for the split-quality check)
const STRUCTURED_DB = path.join(process.cwd(), "data", "mcq-digitizer", "structured-library", "database.json");
const byQp = new Map(fs.existsSync(STRUCTURED_DB) ? JSON.parse(fs.readFileSync(STRUCTURED_DB, "utf8")).map((r) => [r.qpId, r]) : []);
const tops = Object.fromEntries((await list(ROOT)).filter((f) => f.mimeType === FOLDER).map((f) => [f.name, f.id]));
const notes = [];

for (const [key, folders] of Object.entries(BUCKETS)) {
  const [board, subject] = key.split("|");
  const subjectFolder = await childFolder(tops[board], DRIVE_SUBJECT_NAME[subject] || subject);
  const worksheets = subjectFolder && (await childFolder(subjectFolder, "Worksheets"));
  if (!worksheets) { notes.push(`${board}/${subject}: no Worksheets folder on Drive, left as it was`); continue; }
  next[board] ||= {};
  next[board][subject] ||= {};
  const fresh = {}; // bucket -> { QP: [], MS: [] }
  for (const [folderName, target] of Object.entries(folders)) {
    if (target === "MCQ" && !INCLUDE_MCQ) { notes.push(`${board}/${subject}/MCQ: left as it was (add --include-mcq after the answer-key rebuild)`); continue; }
    const catId = await childFolder(worksheets, folderName);
    if (!catId) { notes.push(`${board}/${subject}/${folderName}: folder missing on Drive`); continue; }
    for (const kind of ["QP", "MS"]) {
      const kindId = await childFolder(catId, kind);
      if (!kindId) { notes.push(`${board}/${subject}/${folderName}/${kind}: folder missing on Drive (nothing to list)`); continue; }
      for (const f of (await list(kindId)).filter(isPdf)) {
        const bucket = typeof target === "function" ? target(f.name) : target;
        (fresh[bucket] ||= { QP: [], MS: [] })[kind].push(toEntry(f));
      }
    }
    // a folder that exists but has no QP or MS folder still gets its bucket, so the empty side shows as empty
    const buckets = typeof target === "function" ? ["Paper 2: AS Level Structured Questions", "Paper 4: A Level Structured Questions (A Level)"] : [target];
    for (const b of buckets) fresh[b] ||= { QP: [], MS: [] };
  }
  for (const [bucket, files] of Object.entries(fresh)) {
    if (bucket !== "MCQ") {
      // keep out worksheets whose question paper was split into no or one question (see isBrokenSplit); their pair goes with them
      const broken = new Set(files.QP.filter((f) => byQp.has(f.id) && isBrokenSplit(byQp.get(f.id))).map((f) => pairBaseName(f.name)));
      if (broken.size) {
        notes.push(`${board}/${subject}/${bucket}: ${broken.size} worksheet(s) not listed, their question paper split into too few questions: ${[...broken].slice(0, 3).join("; ")}${broken.size > 3 ? "; ..." : ""}`);
        for (const kind of ["QP", "MS"]) files[kind] = files[kind].filter((f) => !broken.has(pairBaseName(f.name)));
      }
    }
    for (const kind of ["QP", "MS"]) files[kind].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    next[board][subject][bucket] = files;
  }
}

// "Gone from Drive" means an old file id that is in NO bucket of the new map (a worksheet that moved between buckets, for example
// from the A Level Paper 4 list to the new AS Paper 2 list, is not gone).
const allNewIds = new Set();
for (const board of Object.keys(next)) for (const subject of Object.keys(next[board])) for (const files of Object.values(next[board][subject])) for (const f of [...(files.QP || files.qp || []), ...(files.MS || files.ms || [])]) allNewIds.add(f.id);
const rows = [];
let removedTotal = 0, oldTotal = 0, moved = 0;
for (const board of Object.keys(old)) for (const subject of Object.keys(old[board])) for (const bucket of Object.keys(old[board][subject])) {
  const files = old[board][subject][bucket];
  for (const f of [...(files.QP || files.qp || []), ...(files.MS || files.ms || [])]) {
    oldTotal++;
    if (!allNewIds.has(f.id)) { removedTotal++; (removedList ||= []).push(`${board}/${subject}/${bucket}: ${f.name}`); }
  }
}
for (const board of Object.keys(next)) for (const subject of Object.keys(next[board])) for (const bucket of Object.keys(next[board][subject])) {
  const o = old[board]?.[subject]?.[bucket] || {};
  const n = next[board][subject][bucket];
  const qp = diffBuckets(o.QP || o.qp, n.QP || n.qp), ms = diffBuckets(o.MS || o.ms, n.MS || n.ms);
  const oq = (o.QP || o.qp || []).length, om = (o.MS || o.ms || []).length;
  if (qp.added || qp.removed || ms.added || ms.removed || !old[board]?.[subject]?.[bucket]) rows.push(`${board} / ${subject} / ${bucket}: QP ${oq} -> ${(n.QP || []).length}, MS ${om} -> ${(n.MS || []).length}`);
}
var removedList;
console.log(rows.join("\n") || "No changes.");
if (notes.length) console.log("\nNotes:\n" + notes.map((n) => "  " + n).join("\n"));
console.log(`\nFiles in the old map that are in no bucket of the new map (gone from Drive): ${removedTotal} of ${oldTotal}.`);
if (removedList) console.log(removedList.slice(0, 12).map((x) => "  " + x).join("\n") + (removedList.length > 12 ? `\n  ... and ${removedList.length - 12} more` : ""));
if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(next, null, 2));
if (!WRITE) { console.log("Dry run: nothing written. Add --write to apply."); process.exit(0); }
if (removedTotal > oldTotal * 0.05 && !FORCE) { console.error("Refusing to write: more than 5% of the old files are gone from Drive. Check the notes, then add --force."); process.exit(2); }
const backup = `${MAP}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
fs.copyFileSync(MAP, backup);
fs.writeFileSync(MAP, JSON.stringify(next, null, 2));
console.log(`Written. Old map kept as ${path.basename(backup)}.`);

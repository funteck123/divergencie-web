// Local coordination file the Student and Teacher browser-NPC scripts use
// to "message" each other before marking attendance -- deliberately NOT a
// new app API route (this app's live surface shouldn't grow a feature just
// to support two test personas talking to each other). Mirrors the pattern
// already used by lib/npc/state/_approvals.json: a small JSON file both
// sides read and write, never trusted as a source of truth for anything
// the real app itself needs to know.
//
// Keyed by "<OccuranceID>::<DD/MM/YYYY>" (one entry per real class
// occurrence date) so repeated weekly classes each get their own
// independent check-in record. Each side writes ONLY its own field
// (studentCheckin / teacherCheckin) and only ever reads the other's --
// this is what keeps "the teacher doesn't know the student, the student
// doesn't know the teacher" true: neither script has the other persona's
// identity in it anywhere, only this shared file's two named slots.
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "lib/npc-browser/state/rendezvous.json");
const LOCK_FILE = `${FILE}.lock`;

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// TKT-0142: student.mjs and teacher.mjs are cron-triggered as two
// SEPARATE OS processes at the exact same minute, both doing a
// read-modify-write on this one shared file. An in-process lock (a Map
// of promises, the pattern lib/npc/engine.js's own withFileLock uses)
// does NOT protect against this -- that lock only serializes calls
// within a single process, and these are two different processes
// entirely. This needs a real cross-process lock: an exclusive lock
// file, created with `wx` (fails if it already exists), so only one
// process's read-modify-write section runs at a time. Retries with a
// short random backoff (spreads out contention) up to a real timeout,
// and force-clears a stale lock older than 30s (protects against a
// crashed process leaving the lock file behind forever, which would
// otherwise deadlock every future run).
const LOCK_TIMEOUT_MS = 10000;
const STALE_LOCK_MS = 30000;

async function acquireLock() {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
      const fd = fs.openSync(LOCK_FILE, "wx");
      fs.closeSync(fd);
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
        if (age > STALE_LOCK_MS) fs.unlinkSync(LOCK_FILE);
      } catch {
        // Lock file vanished between the stat and the unlink (the other
        // process released it) -- fine, next loop iteration retries.
      }
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    }
  }
  throw new Error("rendezvous.mjs: could not acquire lock file within 10s -- another process may be stuck");
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // Already gone -- fine.
  }
}

export async function checkIn(scheduleId, who) {
  await acquireLock();
  try {
    const all = readAll();
    all[scheduleId] = all[scheduleId] || {};
    all[scheduleId][`${who}Checkin`] = new Date().toISOString();
    writeAll(all);
  } finally {
    releaseLock();
  }
}

export function getEntry(scheduleId) {
  const all = readAll();
  return all[scheduleId] || {};
}

// Polls for the other side's check-in, up to `maxWaitMs`, checking every
// `pollIntervalMs`. Returns true if the other side showed up in time,
// false on timeout -- the caller (student.js / teacher.js) decides what
// "the class doesn't happen" means for their own side (mark the other
// Absent).
export async function waitForOther(scheduleId, otherWho, maxWaitMs, pollIntervalMs = 20000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const entry = getEntry(scheduleId);
    if (entry[`${otherWho}Checkin`]) return true;
    await new Promise((r) => setTimeout(r, Math.min(pollIntervalMs, deadline - Date.now())));
  }
  return !!getEntry(scheduleId)[`${otherWho}Checkin`];
}

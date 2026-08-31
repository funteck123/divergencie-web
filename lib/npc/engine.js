// NPC engine, v1: loads persona+script+state files from lib/npc/state/
// (gitignored, each holds a real API key -- see .gitignore), advances each
// NPC's script by whatever's due as of "today," and writes state back.
// Every action is deterministic (lib/npc/actions.js's ACTIONS table, if/else
// only) -- no LLM call anywhere in this file or its actions. Designed so a
// later phase can swap ONE thing (which of several allowed next actions to
// take, when a script step genuinely offers a choice) for a constrained
// OpenRouter call without touching anything else here.
import fs from "fs/promises";
import path from "path";
import { ACTIONS, evalCondition } from "./actions";
import { findUnknownFlagReferences } from "./actions/flagSchema";

const STATE_DIR = path.join(process.cwd(), "lib", "npc", "state");
const APPROVALS_PATH = path.join(STATE_DIR, "_approvals.json");

function daysBetween(startDate, today) {
  const start = new Date(startDate + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  return Math.floor((now - start) / 86400000);
}

// /swe review, CRITICAL finding: `file` ultimately comes from the tick
// route's request body (npcFile). Without this, "../../../../etc/passwd"
// (or worse, an arbitrary write target) escapes STATE_DIR via path.join --
// a Management-authenticated caller could read or overwrite any file the
// Node process can touch. Bare filename only, no path separators.
function resolveNpcPath(file) {
  if (typeof file !== "string" || !/^[\w-]+\.json$/.test(file) || file.startsWith("_")) {
    throw new Error(`Invalid npc file name: "${file}"`);
  }
  return path.join(STATE_DIR, file);
}

async function loadNpc(file) {
  const raw = await fs.readFile(resolveNpcPath(file), "utf-8");
  return JSON.parse(raw);
}

async function saveNpc(file, npc) {
  await fs.writeFile(resolveNpcPath(file), JSON.stringify(npc, null, 2));
}

// /swe review, MEDIUM finding: two overlapping ticks on the same NPC file
// used to race (read-modify-write with no lock). A per-file promise chain
// is enough for v1 -- this is a single Node process, not multiple workers,
// so an in-process mutex map fully closes the race without needing a real
// file lock.
const fileLocks = new Map();
function withFileLock(file, fn) {
  const prior = fileLocks.get(file) || Promise.resolve();
  const next = prior.then(fn, fn);
  fileLocks.set(file, next.catch(() => {}));
  return next;
}

// Cross-NPC handoff ledger: a Management-persona NPC's review_registrations
// action writes {regFormId: {username, password, name}} entries here; an
// applicant NPC's claim_account_credentials reads its own entry back out.
// Neither NPC's own state file references the other by name -- this is the
// one shared piece of state between them, deliberately just a plain JSON
// file (not a new app DB collection) since it's this simulation's own
// bookkeeping, not real app data.
export async function loadApprovals() {
  try {
    return JSON.parse(await fs.readFile(APPROVALS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export async function saveApprovals(approvals) {
  await fs.writeFile(APPROVALS_PATH, JSON.stringify(approvals, null, 2));
}

// Runs every step whose dayOffset has arrived, in script order, until one
// of three things happens: the script runs out, a future step isn't due
// yet, or a "waitUntil" step's condition is still false. A "waitUntil" step
// is re-evaluated on every future tick without advancing the cursor (a real
// wait, e.g. "keep checking daily until Management approves"), unlike a
// plain "if" step, which only ever gets evaluated once and always advances
// the cursor whether it ran or was skipped.
export async function tickNpc(file, { baseUrl, today, approvals }) {
  return withFileLock(file, () => tickNpcUnlocked(file, { baseUrl, today, approvals }));
}

async function tickNpcUnlocked(file, { baseUrl, today, approvals }) {
  const npc = await loadNpc(file);
  const daysSinceStart = daysBetween(npc.script.startDate, today);
  const ctx = { baseUrl, apiKey: npc.account?.apiKey, today, approvals };
  const ranSteps = [];

  // /swe review, MEDIUM finding: an unrecognized flag name in a script's
  // "if"/"waitUntil" used to fail completely silently -- undefined !==
  // anything, condition just reads as false forever, no signal anywhere.
  // Checked once per NPC (not every tick, to avoid log spam on a
  // long-running script) and written into the run log where a human
  // reviewing state.log will actually see it.
  if (!npc.state.flagSchemaChecked) {
    const warnings = findUnknownFlagReferences(npc.script);
    for (const warning of warnings) {
      npc.state.log.push({ at: new Date().toISOString(), warning });
    }
    npc.state.flagSchemaChecked = true;
  }

  while (npc.state.cursor < npc.script.steps.length) {
    const step = npc.script.steps[npc.state.cursor];
    if (step.dayOffset > daysSinceStart) break; // not due yet

    // /swe review, HIGH finding: evalCondition/handler calls used to be
    // uncaught -- a malformed condition string or a network-level fetch
    // failure (not just a non-2xx response) threw straight out of this
    // loop, killing the whole tickAllNpcs batch and losing this NPC's own
    // failure instead of logging it. Every step now gets its own try/catch,
    // so a broken step becomes a logged error and the NPC's OWN state still
    // saves, other NPCs in the same batch are unaffected either way.
    try {
      if (step.waitUntil && !evalCondition(step.waitUntil, npc.state.flags)) {
        npc.state.log.push({ at: new Date().toISOString(), step: step.id, waiting: true, reason: `waitUntil "${step.waitUntil}" still false` });
        break; // don't advance the cursor, don't touch later steps this tick
      }

      const conditionMet = evalCondition(step.if, npc.state.flags);
      if (conditionMet) {
        const handler = ACTIONS[step.action];
        if (!handler) {
          npc.state.log.push({ at: new Date().toISOString(), step: step.id, error: `Unknown action "${step.action}"` });
        } else {
          const { wait, flags, account, log } = await handler(npc, step.params || {}, ctx);
          if (wait) {
            // The action itself decided it isn't ready (e.g. an approval it
            // depends on hasn't landed yet) -- same handling as a false
            // waitUntil: log it, leave the cursor where it is, try again
            // next tick, don't touch later steps this run.
            npc.state.log.push({ at: new Date().toISOString(), step: step.id, waiting: true, reason: log });
            break;
          }
          Object.assign(npc.state.flags, flags || {});
          if (account) npc.account = { ...npc.account, ...account };
          npc.state.log.push({ at: new Date().toISOString(), step: step.id, action: step.action, result: log });
          ranSteps.push({ step: step.id, action: step.action, result: log });
          // ctx.apiKey stays in sync within this same tick, in case a later
          // step this same run (e.g. claim_account_credentials followed
          // immediately by request_slot) needs the just-minted key.
          ctx.apiKey = npc.account?.apiKey;
        }
      } else {
        npc.state.log.push({ at: new Date().toISOString(), step: step.id, skipped: true, reason: `if "${step.if}" was false` });
      }
    } catch (e) {
      npc.state.log.push({ at: new Date().toISOString(), step: step.id, error: `Uncaught: ${e.message}` });
      npc.state.lastRunDate = today;
      await saveNpc(file, npc);
      // Don't let one broken step corrupt the rest of this NPC's cursor
      // position either -- stop this NPC's own run here, but the batch
      // (tickAllNpcs) still moves on to the next file.
      return { npcId: npc.npcId, name: npc.persona.name, ranSteps, cursor: npc.state.cursor, totalSteps: npc.script.steps.length, crashed: true };
    }
    // "repeat": "daily" steps (e.g. a Management NPC's review_registrations)
    // never advance past themselves -- they're due again every future tick
    // by design. Runs once per tick call, not in a loop, so a script with
    // ONLY a daily step still terminates this while loop instead of spinning.
    if (step.repeat === "daily") break;
    npc.state.cursor += 1;
  }

  npc.state.lastRunDate = today;
  await saveNpc(file, npc);
  return { npcId: npc.npcId, name: npc.persona.name, ranSteps, cursor: npc.state.cursor, totalSteps: npc.script.steps.length };
}

export async function tickAllNpcs({ baseUrl, today }) {
  let files;
  try {
    files = (await fs.readdir(STATE_DIR)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  } catch {
    return [];
  }
  const approvals = await loadApprovals();
  const results = [];
  for (const file of files) {
    // /swe review, HIGH finding: one NPC's own crash used to kill every
    // NPC after it in the batch and skip saveApprovals entirely, losing
    // approvals granted earlier in the same tick. tickNpc/tickNpcUnlocked
    // already catches per-step errors internally; this catch is the
    // second layer, for anything that could still escape (e.g. loadNpc
    // itself failing on a corrupt file).
    try {
      results.push(await tickNpc(file, { baseUrl, today, approvals }));
    } catch (e) {
      results.push({ npcId: file, name: file, ranSteps: [], error: e.message, crashed: true });
    }
  }
  await saveApprovals(approvals);
  return results;
}

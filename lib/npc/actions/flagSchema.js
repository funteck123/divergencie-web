// /swe review, MEDIUM finding: npc.state.flags is an untyped bag -- any
// string key, no validation. A typo'd flag name in a script's "if" or
// "waitUntil" just silently reads undefined and evaluates to false/not-
// equal, no error, nothing points at the typo. This is the exact class of
// bug that nearly shipped once already this session (the "a2" waitUntil
// chicken-and-egg mistake, caught only by re-reading the logic before
// running it, not by anything automatic).
//
// This is intentionally NOT a full type system (over-engineering for a v1
// script format with ~14 actions) -- just a flat registry of every flag
// name any action actually sets, checked against every "if"/"waitUntil"
// condition a script references, so an unrecognized flag name becomes a
// visible warning in the run log instead of a silent no-op forever.
export const KNOWN_FLAGS = new Set([
  // universal (set by callChecked's failure branch, any action)
  "issueFound",
  "issueDetail",
  // self.js
  "hasClassToday",
  "todayScheduleId",
  "lastTicketId",
  "regFormId",
  "hasAccount",
  "trialId",
  "trialStatus",
  "interviewId",
  "interviewStatus",
  "hasResume",
  "guideCount",
  // management.js
  "lastReviewApproved",
  "lastReviewScheduled",
]);

// Extracts the flag name out of a condition string ("flagName==value" or
// "flagName!=value") without re-parsing the whole grammar -- evalCondition
// in http.js is still the single source of truth for what's actually
// valid syntax; this only needs the flag name for the registry check.
function flagNameIn(condition) {
  if (!condition) return null;
  const m = condition.match(/^\s*(\w+)\s*(==|!=)/);
  return m ? m[1] : null;
}

// Returns a list of warning strings, one per unrecognized flag name
// referenced anywhere in the script's steps. Empty array means clean.
export function findUnknownFlagReferences(script) {
  const warnings = [];
  for (const step of script.steps) {
    for (const conditionField of ["if", "waitUntil"]) {
      const flagName = flagNameIn(step[conditionField]);
      if (flagName && !KNOWN_FLAGS.has(flagName)) {
        warnings.push(`step "${step.id}"'s "${conditionField}" references unknown flag "${flagName}" -- check for a typo against KNOWN_FLAGS in lib/npc/actions/flagSchema.js`);
      }
    }
  }
  return warnings;
}

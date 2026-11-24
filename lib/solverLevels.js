// 24 Nov 2026 (owner): a service is now "AS Level" or "A2 Level", not only "A-Level", and the Question Solver must follow it. An AS student sees the
// AS papers (Computer Science: Paper 1 and 2) and not the A2 ones (Paper 3 and 4). All the matching rules live here, in one place, so the route stays small.

/** An A2 student also sees the AS papers (the A Level is AS plus A2, and A2 work builds on AS). Set to false to show an A2 student the A2 papers only. */
export const A2_ALSO_SEES_AS = true;

export function normalizeKey(s) {
  return String(s || "").toLowerCase().replace(/[\s-]+/g, " ").trim();
}

// The library files every Cambridge A Level subject under the board "A Levels". All the spellings of a course that belong there point to it.
const BOARD_ALIASES = {
  "a level": "a levels",
  "a levels": "a levels",
  "as level": "a levels",
  "as levels": "a levels",
  "a2 level": "a levels",
  "a2 levels": "a levels",
};

/** The library board a course belongs under: "AS Level", "A2 Level" and "A-Level" are all "a levels"; "IGCSE" stays "igcse". */
export function boardKeyOf(course) {
  const key = normalizeKey(course);
  return BOARD_ALIASES[key] || key;
}

/** "as", "a2" or "all". A course that only says A Level (older services) or IGCSE is not split by level, so it sees every paper of its subject. */
export function courseLevel(course) {
  const key = normalizeKey(course);
  if (key === "as level" || key === "as levels") return "as";
  if (key === "a2 level" || key === "a2 levels") return "a2";
  return "all";
}

/** The set of paper levels a course may see: {"as"}, {"as","a2"} (or {"a2"}), or {"all"}. */
export function levelsFor(course) {
  const level = courseLevel(course);
  if (level === "as") return new Set(["as"]);
  if (level === "a2") return new Set(A2_ALSO_SEES_AS ? ["as", "a2"] : ["a2"]);
  return new Set(["all"]);
}

export function mergeLevels(a, b) {
  if (!a) return new Set(b);
  const out = new Set([...a, ...b]);
  if (out.has("all")) return new Set(["all"]);
  return out;
}

// Which papers belong to the AS Level and which only to the A2 half, per subject, from the Cambridge syllabuses (checked 24 Nov 2026 against
// cambridgeinternational.org: 9702 Physics, 9701 Chemistry, 9700 Biology and 9618 Computer Science; the other rows follow the same site's syllabus pattern):
//   Physics, Chemistry, Biology: AS = Papers 1, 2 and 3 (3 is the practical test); A2 = Papers 4 and 5.
//   Mathematics 9709: AS = Papers 1, 2, 4 and 5; A2 = Papers 3 and 6 (an A Level takes Papers 1 and 3 plus 4 and 5, or 5 and 6).
//   Computer Science, Information Technology, Economics, Business, Literature: AS = Papers 1 and 2; A2 = Papers 3 and 4.
// The library names some groups differently (it calls Physics Paper 3 "(A Level)"), so this table wins over the words in a group's name.
const AS_PAPERS = {
  physics: [1, 2, 3],
  chemistry: [1, 2, 3],
  biology: [1, 2, 3],
  mathematics: [1, 2, 4, 5],
  "computer science": [1, 2],
  "information technology": [1, 2],
  economics: [1, 2],
  business: [1, 2],
  "literature in english": [1, 2],
};

/** The level a library paper group belongs to: "as", "a2", or null when it is not split by level (shown to everyone). Reads the subject's paper table first, then the words "(AS Level)" / "(A Level)" in the name. */
export function componentLevel(name, subject) {
  const text = String(name || "");
  const asPapers = AS_PAPERS[normalizeKey(subject)];
  const n = /^Paper\s+(\d+)/i.exec(text);
  if (asPapers && n) return asPapers.includes(Number(n[1])) ? "as" : "a2";
  if (/\bAS Levels?\b/i.test(text)) return "as";
  if (/\bA2\b/i.test(text) || /\bA Levels?\b/i.test(text)) return "a2";
  return null;
}

/** May a person with these levels see a paper group of this name, in this subject? */
export function levelAllows(levels, componentName, subject) {
  if (!levels || levels.has("all")) return true;
  const level = componentLevel(componentName, subject);
  return level === null || levels.has(level);
}

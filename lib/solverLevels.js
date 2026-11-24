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

/** The level a library paper group belongs to, read from its name: "(AS Level)" or "AS Level ..." is "as"; "(A Level)" is "a2"; no mention (Mathematics papers) is null, shown to everyone. */
export function componentLevel(name) {
  const text = String(name || "");
  if (/\bAS Levels?\b/i.test(text)) return "as";
  if (/\bA2\b/i.test(text) || /\bA Levels?\b/i.test(text)) return "a2";
  return null;
}

/** May a person with these levels see a paper group of this name? */
export function levelAllows(levels, componentName) {
  if (!levels || levels.has("all")) return true;
  const level = componentLevel(componentName);
  return level === null || levels.has(level);
}

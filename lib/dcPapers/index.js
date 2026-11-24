// 25 Nov 2026 (owner): DC's own practice papers, made by DivergenCIE and not taken from Cambridge, sit in the Question Solver under a component called
// "DC Practice" next to Paper 2 and Paper 4. They are served from this app, not from the extraction service, so they open even when that service is off.
// The first set is IGCSE Mathematics, Algebra: Changing the Subject, in three tiers of 30 multiple choice questions (study/dc-papers/algebra-changing-subject).

export const DC_COMPONENT = "DC Practice";
export const DC_BOARD = "IGCSE";
export const DC_SUBJECT = "Mathematics";

export const DC_PAPERS = [
  { id: "dc-alg-cs-e", title: "DC Algebra: Changing the Subject (Easy)" },
  { id: "dc-alg-cs-m", title: "DC Algebra: Changing the Subject (Medium)" },
  { id: "dc-alg-cs-d", title: "DC Algebra: Changing the Subject (Difficult)" },
];

export const isDcId = (id) => DC_PAPERS.some((p) => p.id === id);

/** Adds the DC Practice component to IGCSE Mathematics, only when that subject is already in the library (a student who is not enrolled in it never sees it). Returns a new library. */
export function withDcLibrary(lib) {
  const maths = lib?.[DC_BOARD]?.[DC_SUBJECT];
  if (!maths) return lib;
  return { ...lib, [DC_BOARD]: { ...lib[DC_BOARD], [DC_SUBJECT]: { ...maths, [DC_COMPONENT]: DC_PAPERS.map((p) => ({ title: p.title, qpId: p.id, msId: p.id })) } } };
}

// One file per paper, loaded only when that paper is opened (each is about 1.5 MB of question pictures).
const LOADERS = {
  "dc-alg-cs-e": () => import("./alg-cs-e.json", { with: { type: "json" } }),
  "dc-alg-cs-m": () => import("./alg-cs-m.json", { with: { type: "json" } }),
  "dc-alg-cs-d": () => import("./alg-cs-d.json", { with: { type: "json" } }),
};

/** The questions of one DC paper in the shape the Question Solver reads: questionNumber, image, optionLetters, correctAnswer. null for an unknown id. */
export async function loadDcPaper(id) {
  const load = LOADERS[id];
  if (!load) return null;
  const mod = await load();
  return { questions: (mod.default ?? mod).questions };
}

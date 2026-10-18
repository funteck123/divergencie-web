import { apiFetch } from "./client";
import type { Completion, SyllabusData, SyllabusLeaderboard, SyllabusMeta } from "@/ui2/features/syllabus/syllabusLogic";

export const listSyllabi = async () => {
  const list = await apiFetch<SyllabusMeta[]>("/api/syllabus/syllabi");
  // The viewer service answers with an object such as { error } when it is busy; a list is what every caller expects.
  if (!Array.isArray(list)) throw new Error("The Syllabus Viewer did not answer properly. Wait a minute and try again.");
  return list;
};
/** Digitizing a booklet can take a while on the first request: the service caches it after that. */
export const getSyllabus = (filename: string) => apiFetch<SyllabusData>(`/api/syllabus/syllabi/${encodeURIComponent(filename)}`);

/** Only "Completed" is saved on the server. The other tags stay in this browser. A failure is swallowed, as in classic: the local tag is what the screen shows. */
export const postTopicComplete = (b: { accountName: string; subject: string; nodeKey: string; nodeLabel: string; completed: boolean }) =>
  apiFetch("/api/syllabus/topic-complete", { method: "POST", body: b }).then(() => undefined, () => undefined);

export async function loadSyllabusProgress(account: string) {
  const [mine, all, lb] = await Promise.all([
    apiFetch<{ completions?: Completion[] }>(`/api/syllabus/progress?account=${encodeURIComponent(account)}`),
    apiFetch<{ completions?: Completion[] }>("/api/syllabus/progress/all"),
    apiFetch<SyllabusLeaderboard>("/api/syllabus/leaderboard"),
  ]);
  return { mine: mine.completions ?? [], all: all.completions ?? [], leaderboard: lb };
}

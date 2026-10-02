import { apiFetch } from "./client";
import type { Completion, SyllabusData, SyllabusLeaderboard, SyllabusMeta } from "@/ui2/features/syllabus/syllabusLogic";

export const listSyllabi = () => apiFetch<SyllabusMeta[]>("/api/syllabus/syllabi");
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

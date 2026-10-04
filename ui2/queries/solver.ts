import { apiFetch } from "./client";
import type { AttemptMeta, AttemptRow, DigitizeResult, GradeResult, Leaderboard, Library, QuestionResponse, SubjectMeta, YearlyLibrary } from "@/ui2/features/solver/solverTypes";

interface TitlesReply { titles?: Record<string, string>; subjects?: Record<string, string> }

/** Everything the library picker needs, fetched together, as the classic page does. */
export interface LibraryBundle {
  library: Library;
  yearly: YearlyLibrary;
  meta: SubjectMeta;
  titles: Record<string, string>;
  subjectsById: Record<string, string>;
}

export async function loadLibraryBundle(hasAccount: boolean): Promise<LibraryBundle> {
  const [library, meta, titles, yearly] = await Promise.all([
    apiFetch<Library>("/api/mcq/library"),
    apiFetch<SubjectMeta>("/api/mcq/subject-meta").catch(() => ({}) as SubjectMeta),
    hasAccount ? apiFetch<TitlesReply>("/api/mcq/paper-titles").catch((): TitlesReply => ({})) : Promise.resolve<TitlesReply>({}),
    apiFetch<YearlyLibrary>("/api/mcq/yearly-library").catch(() => ({}) as YearlyLibrary),
  ]);
  return { library, yearly, meta, titles: titles.titles ?? {}, subjectsById: titles.subjects ?? {} };
}

export const fetchAndDigitize = (qpId: string, msId: string) => apiFetch<DigitizeResult>("/api/mcq/fetch-and-digitize", { method: "POST", body: { qpId, msId }, retry: true });
export const yearlyDigitizeMcq = (paperId: string) => apiFetch<DigitizeResult>("/api/mcq/yearly-digitize", { method: "POST", body: { paperId }, retry: true });
export const getPaper = (qpId: string) => apiFetch<{ questions: DigitizeResult["questions"] }>(`/api/mcq/paper?qpId=${encodeURIComponent(qpId)}`);

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
/** The student's own question paper and mark scheme. Never tracked: it has no stable paper id. */
export async function digitizeUpload(qp: File, ms: File) {
  const [qpBase64, msBase64] = await Promise.all([toBase64(qp), toBase64(ms)]);
  return apiFetch<DigitizeResult>("/api/mcq/digitize", { method: "POST", body: { qpBase64, msBase64 } });
}

export interface StructuredPayload { questions: { questionNumber: string; image: string }[]; answers?: { questionNumber: string; image: string }[] }
/** Structured papers load once, and once more after five seconds when the service answers 502 or 503 (it restarts at times). */
export async function loadStructured(paper: { paperId?: string; qpId?: string; msId?: string }, onRetry?: () => void): Promise<StructuredPayload> {
  const once = () => (paper.paperId ? apiFetch<StructuredPayload>("/api/mcq/yearly-digitize", { method: "POST", body: { paperId: paper.paperId }, retry: true }) : apiFetch<StructuredPayload>("/api/mcq/digitize-structured", { method: "POST", body: { qpId: paper.qpId, msId: paper.msId }, retry: true }));
  try {
    return await once();
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 502 && status !== 503) throw e;
    onRetry?.();
    await new Promise((r) => setTimeout(r, 5000));
    return once();
  }
}

/**
 * Grade one written answer. The service answers with a job id and the answer is read by asking for the job every two seconds,
 * up to six minutes, so a slow grader never holds one long request open. `onTick` reports the seconds waited.
 */
export async function gradeStructured(payload: { paperId?: string; qpId?: string; msId?: string; questionNumber: string; studentAnswer: string }, onTick?: (seconds: number) => void, signal?: AbortSignal): Promise<GradeResult> {
  const start = await apiFetch<GradeResult & { jobId?: string }>("/api/mcq/grade-structured-question", { method: "POST", body: { ...payload, async: true }, signal });
  if (!start.jobId) return { ...start, questionNumber: payload.questionNumber };
  const startedAt = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));
    if (signal?.aborted) throw new Error("Grading was cancelled.");
    onTick?.(Math.round((Date.now() - startedAt) / 1000));
    const job = await apiFetch<{ status: string; result?: GradeResult; error?: string }>(`/api/mcq/grade-structured-status?jobId=${encodeURIComponent(start.jobId)}`, { signal });
    if (job.status === "done" && job.result) return { ...job.result, questionNumber: payload.questionNumber };
    if (job.status === "error") throw new Error(job.error || "Grading failed.");
    if (Date.now() - startedAt > 6 * 60 * 1000) throw new Error("Grading took too long. Please press Submit answer again.");
  }
}

export async function postAttempt(a: { accountId: string; accountName: string; meta: AttemptMeta; mode: "test" | "practice"; score?: number; totalQuestions: number; timeTakenSeconds: number }): Promise<string | null> {
  const body: Record<string, unknown> = { accountId: a.accountId, accountName: a.accountName, subject: a.meta.subject, chapter: a.meta.chapter, paperId: a.meta.paperId, totalQuestions: a.totalQuestions, timeTakenSeconds: a.timeTakenSeconds, mode: a.mode };
  if (a.mode === "test") body.score = a.score;
  const res = await apiFetch<{ attempt?: { id: string } }>("/api/mcq/attempts", { method: "POST", body });
  return res.attempt?.id ?? null;
}
/** Saving mistakes never blocks the result screen: a failure is swallowed, as in classic. */
export const postMistakes = (b: { accountId: string; accountName: string; subject: string; chapter: string | null; paperId: string; results: unknown[]; attemptId: string | null }) =>
  b.results.length === 0 ? Promise.resolve() : apiFetch("/api/mcq/mistakes", { method: "POST", body: b }).then(() => undefined, () => undefined);
export const getMistakes = (account: string, subject: string) =>
  apiFetch<{ mistakes?: { paperId: string; subject: string; chapter: string | null; questionNumber: string | number }[] }>(`/api/mcq/mistakes?account=${encodeURIComponent(account)}&subject=${encodeURIComponent(subject)}`);

export async function loadProgress(account: string) {
  const [mine, all, lb, chart] = await Promise.all([
    apiFetch<{ attempts?: AttemptRow[] }>(`/api/mcq/progress?account=${encodeURIComponent(account)}`),
    apiFetch<{ attempts?: AttemptRow[] }>("/api/mcq/progress/all"),
    apiFetch<Leaderboard>("/api/mcq/leaderboard"),
    apiFetch<{ chart?: Record<string, Record<string, number>> }>(`/api/mcq/mistakes/chart?account=${encodeURIComponent(account)}`).catch(() => ({ chart: undefined as undefined | Record<string, Record<string, number>> })),
  ]);
  return { mine: mine.attempts ?? [], all: all.attempts ?? [], leaderboard: lb, mistakeChart: chart.chart };
}
export const getQuestionResponses = (account: string, attemptId: string) => apiFetch<{ responses?: QuestionResponse[] }>(`/api/mcq/question-responses?account=${encodeURIComponent(account)}&attemptId=${encodeURIComponent(attemptId)}`);
export const getQuestionImage = (paperId: string, questionNumber: string, kind: "qp" | "ms") => apiFetch<{ image: string }>(`/api/mcq/question-image?paperId=${encodeURIComponent(paperId)}&questionNumber=${encodeURIComponent(questionNumber)}&kind=${kind}`);

export const pdfUrl = (fileId: string, filename: string) => `/api/mcq/pdf?fileId=${encodeURIComponent(fileId)}&filename=${encodeURIComponent(filename)}`;
export const yearlyPdfUrl = (paperId: string) => `/api/mcq/yearly-pdf?paperId=${encodeURIComponent(paperId)}`;
export const yearlyAudioUrl = (paperId: string) => `/api/mcq/yearly-audio?paperId=${encodeURIComponent(paperId)}`;

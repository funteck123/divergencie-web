"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/ui2/components/Button";
import type { SessionUser } from "@/ui2/components/RequireUser";
import { digitizeUpload, fetchAndDigitize, getMistakes, getPaper, gradeStructured, loadLibraryBundle, loadMyAttempts, loadStructured, postAttempt, postMistakes, yearlyDigitizeMcq } from "@/ui2/queries/solver";
import { LibraryStage, type PickedPaper } from "./LibraryStage";
import { ProgressStage } from "./ProgressStage";
import { QuizStage, type GradingStatus } from "./QuizStage";
import { ExamEndedStage, SelfMarkStage } from "./SelfMarkStage";
import { checkSelfMark, selfMarkRemark, selfMarkTotals } from "./selfMarkLogic";
import { ResultsStage, type Results } from "./ResultsStage";
import { UploadStage } from "./UploadStage";
import { initialQuiz, quizReducer } from "./quizMachine";
import { statusIndex } from "./progressLogic";
import { AUTOSAVE_KEY, SAVES_KEY, chapterNames, findSave, gradeMcq, isFullMarks, mistakeResults, naturalQuestionSort, pruneSaves, saveSlot, scoreStructured, titleIndex, type AutosaveRecord } from "./solverLogic";
import type { AttemptMeta, GradeResult, McqQuestion, StructuredItem, YearlyPaper } from "./solverTypes";
import "./solver.css";

type Stage = "library" | "upload" | "mode" | "quiz" | "results" | "progress";
type Paper = { title: string; meta: AttemptMeta | null; pdf: { qpId: string; msId?: string; title: string; yearlyId?: string } | null; audio: YearlyPaper | null; ref: { paperId?: string; qpId?: string; msId?: string } };

// Saved attempts (TKT-0442): one per account and paper, so a second paper no longer replaces the first. The classic single slot is written too, so the classic page can resume.
const readLegacy = (): AutosaveRecord | null => {
  try { return JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY) || "null"); } catch { return null; }
};
const readSaves = (): Record<string, AutosaveRecord> => {
  try { return pruneSaves(JSON.parse(window.localStorage.getItem(SAVES_KEY) || "{}")); } catch { return {}; }
};
const writeSave = (rec: AutosaveRecord) => {
  try {
    window.localStorage.setItem(SAVES_KEY, JSON.stringify({ ...readSaves(), [saveSlot(rec.acct, rec.paperKey)]: rec }));
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(rec));
  } catch { /* private mode or quota: autosave is best effort */ }
};
const clearSave = (account: string, paperKey: string | undefined) => {
  if (!paperKey) return;
  try {
    const { [saveSlot(account, paperKey)]: _gone, ...rest } = readSaves();
    window.localStorage.setItem(SAVES_KEY, JSON.stringify(rest));
    const legacy = readLegacy();
    if (legacy && legacy.acct === account && legacy.paperKey === paperKey) window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch { /* best effort */ }
};
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * The Question Solver in the new UI: library, upload, quiz, results and progress as stages. The rules live in quizMachine
 * and solverLogic (pure, unit-tested); this file only joins them to the network and the screen. Same /api/mcq/* calls and
 * same request bodies as the classic page, so progress saved in either UI shows in both.
 */
export function SolverView({ user }: { user: SessionUser }) {
  const account = user.UserID;
  const bundleQ = useQuery({ queryKey: ["solver-library"] as const, queryFn: () => loadLibraryBundle(true) });
  const bundle = bundleQ.data;
  const qc = useQueryClient();
  const mineQ = useQuery({ queryKey: ["solver-mine", account] as const, queryFn: () => loadMyAttempts(account), enabled: !!account });
  const statuses = useMemo(() => statusIndex(mineQ.data ?? []), [mineQ.data]);
  /** Every saved attempt also refreshes the picker's markers and the progress screen. */
  const saveAttempt: typeof postAttempt = async (a) => {
    const id = await postAttempt(a);
    void qc.invalidateQueries({ queryKey: ["solver-mine"] });
    void qc.invalidateQueries({ queryKey: ["solver-progress"] });
    return id;
  };
  const titles = useMemo(() => (bundle ? titleIndex(bundle.library, bundle.yearly, bundle.titles) : {}), [bundle]);
  const names = useMemo(() => (bundle ? chapterNames(bundle.library, bundle.titles, bundle.subjectsById) : {}), [bundle]);

  const [stage, setStage] = useState<Stage>("library");
  const [quiz, dispatch] = useReducer(quizReducer, initialQuiz);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [fromCache, setFromCache] = useState(false); // TKT-0420: the open worksheet is the saved copy
  const [mcq, setMcq] = useState<McqQuestion[]>([]);
  const [structured, setStructured] = useState<StructuredItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [graded, setGraded] = useState<Record<string, { result: GradeResult; text: string }>>({});
  const [pending, setPending] = useState<Record<string, GradingStatus>>({});
  const [resume, setResume] = useState<AutosaveRecord | null>(null);
  const [marking, setMarking] = useState(false); // TKT-0442: the student is giving their own marks
  const [selfSaving, setSelfSaving] = useState(false);
  const gradeRuns = useRef(new Map<string, AbortController>());
  const paperKeyRef = useRef<string | undefined>(undefined);
  paperKeyRef.current = paper?.meta?.paperId;

  // The clock: one tick a second while running.
  useEffect(() => {
    if (quiz.phase !== "running") return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [quiz.phase]);

  // Autosave for tracked Test attempts: while answering, after the exam is ended, and while marking. It stays until the score is saved.
  const testLive = (quiz.phase === "running" || quiz.phase === "paused" || quiz.phase === "ended") && quiz.mode === "test" && !!paper?.meta;
  useEffect(() => {
    if (!testLive || !paper?.meta) return;
    writeSave({ v: 1, acct: account, kind: quiz.kind, paperKey: paper.meta.paperId, savedAt: Date.now(), elapsed: quiz.elapsed, answers: { ...quiz.answers }, flags: [...quiz.flags], texts: { ...quiz.texts }, ended: quiz.phase === "ended", marking: quiz.phase === "ended" && marking, selfMarks: { ...quiz.selfMarks }, graded });
  }, [testLive, quiz, paper, account, marking, graded]);

  /** Leave the paper. A saved attempt is kept unless the student chose to discard it, so going back never loses their work. */
  const reset = useCallback((discard = false) => {
    gradeRuns.current.forEach((c) => c.abort());
    gradeRuns.current.clear();
    if (discard) clearSave(account, paperKeyRef.current);
    dispatch({ type: "cancel" });
    setMarking(false); setSelfSaving(false);
    setPaper(null); setMcq([]); setStructured([]); setGraded({}); setPending({}); setResults(null); setResume(null);
    setSaveStatus(""); setError(""); setStatus(""); setSubmitting(false);
    setStage("library");
  }, [account]);

  // ---- loading a paper -----------------------------------------------------------------------------------------
  async function openPaper(p: PickedPaper) {
    setBusy(true); setError(""); setStatus("Loading questions…");
    const title = p.paper.title;
    const ref = p.source === "yearly" ? { paperId: p.paper.paperId } : { qpId: p.paper.qpId, msId: p.paper.msId };
    const pdf = p.source === "topical" ? { qpId: p.paper.qpId, msId: p.paper.msId, title } : { qpId: p.paper.paperId, msId: p.paper.paperId, title, yearlyId: p.paper.paperId };
    const audio = p.source === "yearly" && p.paper.audioPath !== undefined ? p.paper : null;
    try {
      if (p.structured) {
        const data = await loadStructured(ref, () => setStatus("The service is waking up. Trying again in a few seconds…"));
        const byNo = new Map((data.answers ?? []).map((a) => [a.questionNumber, a.image]));
        const items = [...data.questions].sort((a, b) => naturalQuestionSort(a.questionNumber, b.questionNumber)).map((q) => ({ questionNumber: q.questionNumber, qImage: q.image, msImage: byNo.get(q.questionNumber) ?? null }));
        setFromCache(false);
        setStructured(items);
        dispatch({ type: "load", kind: "structured", order: items.map((i) => i.questionNumber) });
      } else {
        const data = p.source === "yearly" ? await yearlyDigitizeMcq(p.paper.paperId) : await fetchAndDigitize(p.paper.qpId, p.paper.msId ?? "");
        setFromCache(!!data.fromCache);
        setMcq(data.questions);
        dispatch({ type: "load", kind: "mcq", order: data.questions.map((q) => q.questionNumber) });
      }
      setPaper({ title, meta: p.meta, pdf, audio, ref });
      setResume(findSave(readSaves(), readLegacy(), account, p.structured ? "structured" : "mcq", p.meta));
      setStage("mode");
      setStatus("");
    } catch (e) {
      setStatus("");
      setError(`Couldn't load this paper (${msg(e)}).`);
    } finally {
      setBusy(false);
    }
  }

  async function openUpload(qp: File, ms: File) {
    setBusy(true); setError("");
    try {
      const data = await digitizeUpload(qp, ms);
      setMcq(data.questions);
      dispatch({ type: "load", kind: "mcq", order: data.questions.map((q) => q.questionNumber) });
      setPaper({ title: qp.name, meta: null, pdf: null, audio: null, ref: {} });
      setResume(null);
      setStage("mode");
    } catch (e) {
      setError(`Couldn't digitize these files (${msg(e)}).`);
    } finally {
      setBusy(false);
    }
  }

  async function startMistakes(board: string, subject: string, component: string) {
    if (!bundle) return;
    const ids = new Set((bundle.library[board]?.[subject]?.[component] ?? []).map((p) => p.qpId));
    setBusy(true); setError(""); setStatus(`Loading your mistakes in ${component}…`);
    try {
      const res = await getMistakes(account, `${board} ${subject}`);
      const mine = (res.mistakes ?? []).filter((m) => ids.has(m.paperId));
      if (mine.length === 0) return setStatus(`No mistakes to practice in ${component} right now. Nice work.`);
      const byPaper = new Map<string, { subject: string; chapter: string | null; nums: Set<string> }>();
      for (const m of mine) {
        if (!byPaper.has(m.paperId)) byPaper.set(m.paperId, { subject: m.subject, chapter: m.chapter, nums: new Set() });
        byPaper.get(m.paperId)?.nums.add(String(m.questionNumber));
      }
      const merged: McqQuestion[] = [];
      for (const [paperId, info] of byPaper) {
        try {
          const data = await getPaper(paperId);
          for (const q of data.questions) if (info.nums.has(String(q.questionNumber))) merged.push({ ...q, _origin: { paperId, subject: info.subject, chapter: info.chapter } });
        } catch { /* not in the cached library: it cannot be replayed */ }
      }
      if (merged.length === 0) return setStatus("Your mistakes couldn't be reloaded right now. Their source papers aren't cached. Try again later.");
      // Question numbers can repeat across papers, so number them by position in this mixed quiz.
      const numbered = merged.map((q, i) => ({ ...q, questionNumber: String(i + 1), _sourceNumber: q.questionNumber }) as McqQuestion & { _sourceNumber: string });
      setMcq(numbered);
      setPaper({ title: "Mistakes Mode", meta: null, pdf: null, audio: null, ref: {} });
      dispatch({ type: "load", kind: "mcq", order: numbered.map((q) => q.questionNumber) });
      dispatch({ type: "start", mode: "mistakes" });
      setStatus("");
      setStage("quiz");
    } catch (e) {
      setStatus(`Couldn't load your mistakes (${msg(e)}).`);
    } finally {
      setBusy(false);
    }
  }

  function begin(mode: "practice" | "test", resumeRec?: AutosaveRecord | null) {
    dispatch({ type: "start", mode });
    if (resumeRec) {
      dispatch({ type: "restore", elapsed: resumeRec.elapsed, answers: resumeRec.answers, flags: resumeRec.flags, texts: resumeRec.texts, selfMarks: resumeRec.selfMarks });
      setGraded(resumeRec.graded ?? {});
      if (resumeRec.ended) { dispatch({ type: "end" }); setMarking(!!resumeRec.marking); }
    }
    setStage("quiz");
  }

  // ---- written answers ------------------------------------------------------------------------------------------
  async function gradeOne(q: string) {
    const text = (quiz.texts[q] ?? "").trim();
    if (!text || !paper) return;
    gradeRuns.current.get(q)?.abort();
    const ctrl = new AbortController();
    gradeRuns.current.set(q, ctrl);
    setPending((p) => ({ ...p, [q]: { state: "grading", seconds: 0 } }));
    try {
      const result = await gradeStructured({ ...paper.ref, questionNumber: q, studentAnswer: text }, (seconds) => setPending((p) => ({ ...p, [q]: { state: "grading", seconds } })), ctrl.signal);
      setGraded((g) => ({ ...g, [q]: { result, text } }));
      setPending((p) => { const { [q]: _x, ...rest } = p; return rest; });
      return result;
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setPending((p) => ({ ...p, [q]: { state: "error", message: msg(e) } }));
    }
  }
  const grading = useMemo(() => {
    const out: Record<string, GradingStatus> = {};
    for (const q of quiz.order) {
      if (pending[q]) out[q] = pending[q];
      else if (graded[q]) out[q] = { state: graded[q].text === (quiz.texts[q] ?? "").trim() ? "done" : "stale" };
    }
    return out;
  }, [quiz.order, quiz.texts, pending, graded]);

  // ---- submit ---------------------------------------------------------------------------------------------------
  async function submit() {
    if (!paper) return;
    setSubmitting(true); setSaveStatus("");
    if (quiz.kind === "mcq") {
      const g = gradeMcq(mcq, quiz.answers, new Set(quiz.flags));
      setResults({ kind: "mcq", results: g.results, correct: g.correct, gradable: g.gradable });
      clearSave(account, paper.meta?.paperId);
      dispatch({ type: "submit" });
      setStage("results");
      setSubmitting(false);
      if (quiz.mode === "mistakes") {
        setSaveStatus("Saving your results…");
        const groups = new Map<string, { paperId: string; subject: string; chapter: string | null; items: typeof g.results }>();
        for (const r of g.results) {
          const o = r._origin;
          if (!o) continue;
          const src = { ...r, questionNumber: (r as unknown as { _sourceNumber?: string })._sourceNumber ?? r.questionNumber };
          if (!groups.has(o.paperId)) groups.set(o.paperId, { ...o, items: [] });
          groups.get(o.paperId)?.items.push(src);
        }
        await Promise.all([...groups.values()].map((grp) => postMistakes({ accountId: account, accountName: user.Name, subject: grp.subject, chapter: grp.chapter, paperId: grp.paperId, results: mistakeResults(grp.items), attemptId: null })));
        setSaveStatus("Results saved. Fixed questions won't show up here again.");
      } else if (paper.meta && g.attemptedGradable > 0) {
        setSaveStatus("Saving your score…");
        try {
          const attemptId = await saveAttempt({ accountId: account, accountName: user.Name, meta: paper.meta, mode: "test", score: g.correct, totalQuestions: g.attemptedGradable, timeTakenSeconds: quiz.elapsed });
          await postMistakes({ accountId: account, accountName: user.Name, subject: paper.meta.subject, chapter: paper.meta.chapter, paperId: paper.meta.paperId, results: mistakeResults(g.results), attemptId });
          setSaveStatus("Score saved to your progress history.");
        } catch (e) {
          setSaveStatus(`Couldn't save this score to your progress history (${msg(e)}).`);
        }
      } else if (!paper.meta) setSaveStatus("Manually uploaded papers aren't tracked in your progress history.");
      return;
    }
    // Written answers: grade what is missing or stale, then score only what was attempted.
    dispatch({ type: "pause" });
    const stragglers = structured.map((i) => i.questionNumber).filter((q) => { const t = (quiz.texts[q] ?? "").trim(); return t && graded[q]?.text !== t; });
    const fresh: Record<string, GradeResult> = {};
    if (stragglers.length) {
      setStatus(`Grading ${stragglers.length} remaining question${stragglers.length === 1 ? "" : "s"}. This can take a little while…`);
      const done = await Promise.all(stragglers.map((q) => gradeOne(q)));
      done.forEach((r, i) => { const q = stragglers[i]; if (r && q) fresh[q] = r; });
      setStatus("");
    }
    const failed = stragglers.filter((q) => !fresh[q]);
    if (failed.length) { setSubmitting(false); setError(`Question${failed.length === 1 ? "" : "s"} ${failed.join(", ")} couldn't be graded. Press Submit for AI grading to try again, or mark it yourself.`); dispatch({ type: "resume" }); return; }
    setError("");
    const attempted = structured.map((i) => fresh[i.questionNumber] ?? graded[i.questionNumber]?.result).filter((r): r is GradeResult => !!r);
    const { gradable, correct } = scoreStructured(attempted);
    setResults({ kind: "structured", graded: attempted, correct, gradable: gradable.length });
    clearSave(account, paper.meta?.paperId);
    dispatch({ type: "submit" });
    setStage("results");
    setSubmitting(false);
    if (paper.meta && gradable.length > 0) {
      setSaveStatus("Saving your score…");
      try {
        const attemptId = await saveAttempt({ accountId: account, accountName: user.Name, meta: paper.meta, mode: "test", score: correct, totalQuestions: gradable.length, timeTakenSeconds: quiz.elapsed });
        const items = gradable.map((g) => ({ questionNumber: g.questionNumber, verdict: isFullMarks(g) ? "correct" : "incorrect", studentAnswer: g.studentAnswerVerbatim, marksAwarded: g.marksAwarded, marksAvailable: g.marksAvailable, remark: g.remark, lineFeedback: g.lineFeedback, markBreakdown: g.markBreakdown, styleChecklist: g.styleChecklist, fullMarkAnswer: g.fullMarkAnswer, lowConfidence: g.lowConfidence }));
        await postMistakes({ accountId: account, accountName: user.Name, subject: paper.meta.subject, chapter: paper.meta.chapter, paperId: paper.meta.paperId, results: mistakeResults(items), attemptId });
        setSaveStatus("Score saved to your progress history.");
      } catch (e) {
        setSaveStatus(`Couldn't save this score to your progress history (${msg(e)}).`);
      }
    } else if (!paper.meta) setSaveStatus("Manually uploaded papers aren't tracked in your progress history.");
  }

  /** TKT-0442: the student's own marks become the attempt. They are saved like an AI result, each answer marked "Self-marked" so a teacher can tell. */
  async function saveSelfMarks() {
    if (!paper) return;
    const rows = structured.map((i) => ({ q: i.questionNumber, r: checkSelfMark(quiz.selfMarks[i.questionNumber]) })).filter((x) => x.r.state === "ok");
    if (rows.length === 0) return;
    setSelfSaving(true); setError("");
    const t = selfMarkTotals(structured.map((i) => i.questionNumber), quiz.selfMarks);
    const graded: GradeResult[] = rows.flatMap(({ q, r }) => r.state === "ok" ? [{ questionNumber: q, marksAwarded: r.awarded, marksAvailable: r.outOf, remark: selfMarkRemark(r.note), studentAnswerVerbatim: (quiz.texts[q] ?? "").trim() }] : []);
    setResults({ kind: "structured", graded, correct: t.fullMarks, gradable: t.marked, self: { awarded: t.awarded, outOf: t.outOf } });
    dispatch({ type: "submit" });
    setStage("results");
    setMarking(false); setSelfSaving(false);
    if (!paper.meta) return setSaveStatus("Manually uploaded papers aren't tracked in your progress history.");
    setSaveStatus("Saving your marks…");
    try {
      const attemptId = await saveAttempt({ accountId: account, accountName: user.Name, meta: paper.meta, mode: "test", score: t.fullMarks, totalQuestions: t.marked, timeTakenSeconds: quiz.elapsed });
      const items = graded.map((g) => ({ questionNumber: g.questionNumber, verdict: g.marksAwarded === g.marksAvailable ? "correct" : "incorrect", studentAnswer: g.studentAnswerVerbatim ?? "", marksAwarded: g.marksAwarded, marksAvailable: g.marksAvailable, remark: g.remark }));
      await postMistakes({ accountId: account, accountName: user.Name, subject: paper.meta.subject, chapter: paper.meta.chapter, paperId: paper.meta.paperId, results: mistakeResults(items), attemptId });
      clearSave(account, paper.meta.paperId);
      setSaveStatus("Your marks are saved to your progress history, marked as self-marked.");
    } catch (e) {
      setSaveStatus(`Couldn't save your marks yet (${msg(e)}). They are kept on this device.`);
    }
  }

  async function finishPractice() {
    if (paper?.meta) {
      setSubmitting(true);
      try { await saveAttempt({ accountId: account, accountName: user.Name, meta: paper.meta, mode: "practice", totalQuestions: quiz.kind === "mcq" ? mcq.length : structured.length, timeTakenSeconds: quiz.elapsed }); } catch { /* practice history is best effort */ }
      setSubmitting(false);
    }
    reset();
  }

  // ---- screens --------------------------------------------------------------------------------------------------
  if (stage === "progress") return <ProgressStage account={account} titles={titles} names={names} library={bundle?.library ?? {}} yearly={bundle?.yearly ?? {}} onBack={() => setStage("library")} />;
  if (stage === "upload") return <UploadStage busy={busy} error={error} onDigitize={(qp, ms) => void openUpload(qp, ms)} onBack={() => setStage("library")} />;
  if (stage === "results" && results) return <ResultsStage results={results} saveStatus={saveStatus} canOpenProgress={!!paper?.meta && quiz.mode === "test"} onProgress={() => setStage("progress")} onBack={() => reset()} backLabel="Back to library" pdfLinks={paper?.pdf} />;
  if (stage === "mode" && paper) {
    const count = quiz.kind === "mcq" ? mcq.length : structured.length;
    return (
      <div className="u2-solver">
        <h2>{paper.title}</h2>
        <p role="status" className="u2-muted">{count} question{count === 1 ? "" : "s"} ready.</p>
        {fromCache && <p role="note" className="u2-muted">Saved copy: the main Question Solver is offline right now. You can still practise. Your score may not be saved to your progress history until it is back.</p>}
        {resume && (
          <div className="u2-warnbox" role="alert">
            You have an unfinished attempt on this paper, saved {Math.max(1, Math.round((Date.now() - resume.savedAt) / 60000))} min ago.
            <div className="u2-rowactions">
              <Button variant="primary" onClick={() => begin("test", resume)}>Resume it</Button>
              <Button variant="ghost" onClick={() => { clearSave(account, paper.meta?.paperId); setResume(null); }}>Start fresh</Button>
            </div>
          </div>
        )}
        <Button variant="primary" onClick={() => begin("practice")}>Practice Mode</Button>
        <p className="u2-muted">Browse freely, no grading.</p>
        <Button variant="secondary" onClick={() => begin("test")}>Test Mode</Button>
        <p className="u2-muted">{quiz.kind === "mcq" ? "Timed, one submission, see your score." : "Timed. Write your working, submit each answer, then submit the quiz."}</p>
        <Button variant="ghost" onClick={() => reset()}>← Back to library</Button>
      </div>
    );
  }
  if (stage === "quiz" && paper && quiz.phase === "ended") {
    if (marking) return <SelfMarkStage title={paper.title} items={structured} texts={quiz.texts} marks={quiz.selfMarks} dispatch={dispatch} saving={selfSaving} error={error} onSave={() => void saveSelfMarks()} onBack={() => setMarking(false)} />;
    return <ExamEndedStage title={paper.title} elapsed={quiz.elapsed} answered={structured.filter((i) => (quiz.texts[i.questionNumber] ?? "").trim()).length} total={structured.length} error={error} status={status} busy={submitting} onAi={() => void submit()} onSelf={() => { setError(""); setMarking(true); }} onReopen={() => dispatch({ type: "reopen" })} onLeave={() => { if (window.confirm("Leave without saving? Your answers will be lost.")) reset(true); }} />;
  }
  if (stage === "quiz" && paper) {
    return (
      <>
        {error && <p role="alert" className="u2-errorbox">{error}</p>}
        {status && <p role="status" className="u2-muted">{status}</p>}
        <QuizStage state={quiz} dispatch={dispatch} mcq={mcq} structured={structured} title={paper.title} pdfLinks={paper.pdf} audio={paper.audio} grading={grading} onGrade={(q) => void gradeOne(q)} onSubmit={() => void submit()} onCancel={() => reset(true)} onFinishPractice={() => void finishPractice()} submitting={submitting} />
      </>
    );
  }
  return (
    <LibraryStage
      bundle={bundle} loading={bundleQ.isPending} error={bundleQ.error ? `Couldn't load the library (${bundleQ.error.message}).` : error}
      canMistakes busy={busy} status={status} statuses={statuses}
      onPick={(p) => void openPaper(p)} onMistakes={(b, s, c) => void startMistakes(b, s, c)}
      onUpload={() => { setError(""); setStage("upload"); }} onProgress={() => setStage("progress")}
    />
  );
}

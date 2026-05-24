"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Trophy, Play, RotateCcw, CheckCircle2, XCircle, ChevronRight, Loader2, BookOpen, BarChart2 } from "lucide-react";
import { saveMockResult } from "@/lib/actions/mock";
import { useSession } from "next-auth/react";

// Static question bank — replace/extend with DB-driven questions in Phase 2
const QUESTION_BANK: Record<string, Record<string, any[]>> = {
  "IGCSE Mathematics": {
    core: [
      { q: "Solve: 2x + 5 = 13", opts: ["x = 3", "x = 4", "x = 5", "x = 9"], ans: 1 },
      { q: "The gradient of y = 3x² + 2x at x = 1 is:", opts: ["5", "8", "6", "10"], ans: 1 },
      { q: "Factorise: x² - 9", opts: ["(x-3)(x+3)", "(x-9)(x+1)", "(x-3)²", "(x+9)(x-1)"], ans: 0 },
      { q: "Convert 0.35 to a fraction in lowest terms:", opts: ["7/20", "35/100", "3/5", "7/10"], ans: 0 },
      { q: "If 3y - 7 = 2(y + 1), then y = ?", opts: ["5", "9", "7", "4"], ans: 1 },
      { q: "A circle has radius 5cm. Its area is:", opts: ["25π cm²", "10π cm²", "15π cm²", "50π cm²"], ans: 0 },
      { q: "What is 15% of 240?", opts: ["36", "32", "30", "40"], ans: 0 },
      { q: "The nth term of sequence 3, 7, 11, 15... is:", opts: ["4n - 1", "3n + 1", "4n + 1", "n + 3"], ans: 0 },
      { q: "tan(45°) = ?", opts: ["1", "√2", "0", "½"], ans: 0 },
      { q: "Simplify: (2x³)² / 4x²", opts: ["x⁴", "x²", "4x⁴", "2x⁴"], ans: 0 },
    ]
  },
  "A Level Chemistry": {
    core: [
      { q: "Which equation represents combustion of methane?", opts: ["CH₄ + 2O₂ → CO₂ + 2H₂O", "C + O₂ → CO₂", "2H₂ + O₂ → 2H₂O", "CH₄ → C + 2H₂"], ans: 0 },
      { q: "The Kc expression for A + 2B ⇌ C is:", opts: ["[C]/[A][B]²", "[A][B]²/[C]", "[C][A]/[B]²", "[A][B]/[C]"], ans: 0 },
      { q: "Which is a nucleophile?", opts: ["OH⁻", "H⁺", "AlCl₃", "Cl₂"], ans: 0 },
      { q: "Enthalpy of formation of CO₂ involves:", opts: ["C(s) + O₂(g) → CO₂(g)", "2C + 2O₂ → 2CO₂", "CO + ½O₂ → CO₂", "C + CO₂ → 2CO"], ans: 0 },
      { q: "Le Chatelier: increasing pressure favours:", opts: ["Side with fewer moles of gas", "Side with more moles", "Neither side", "Depends on temperature"], ans: 0 },
      { q: "Which has the highest electronegativity?", opts: ["F", "O", "N", "Cl"], ans: 0 },
      { q: "Rate = k[A]²[B]. Order with respect to B is:", opts: ["1", "2", "0", "3"], ans: 0 },
      { q: "Which orbital fills first — 4s or 3d?", opts: ["4s", "3d", "Same energy", "Context-dependent"], ans: 0 },
      { q: "The unit of rate constant for a 2nd order reaction is:", opts: ["mol⁻¹ dm³ s⁻¹", "s⁻¹", "mol dm⁻³ s⁻¹", "dm⁶ mol⁻² s⁻¹"], ans: 0 },
      { q: "SN1 reactions are favoured by:", opts: ["Tertiary carbons + polar solvents", "Primary carbons + strong nucleophiles", "Low temperature", "Aprotic solvents"], ans: 0 },
    ]
  },
  "IGCSE Physics": {
    core: [
      { q: "F = ma. If m = 5 kg and a = 3 m/s², F = ?", opts: ["15 N", "12 N", "8 N", "1.67 N"], ans: 0 },
      { q: "Speed of light in vacuum:", opts: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10¹⁰ m/s", "1.5 × 10⁸ m/s"], ans: 0 },
      { q: "KE = ½mv². If m = 2 kg, v = 4 m/s, KE = ?", opts: ["16 J", "8 J", "4 J", "32 J"], ans: 0 },
      { q: "V = IR. If V = 12V, R = 4Ω, I = ?", opts: ["3 A", "48 A", "0.33 A", "8 A"], ans: 0 },
      { q: "Which wave is longitudinal?", opts: ["Sound", "Light", "Radio", "X-ray"], ans: 0 },
      { q: "P = W/t. 500 J in 10 s gives power of:", opts: ["50 W", "500 W", "5000 W", "0.02 W"], ans: 0 },
      { q: "Hooke's Law: F = kx. If k = 200 N/m, x = 0.05 m, F = ?", opts: ["10 N", "4000 N", "0.25 N", "200 N"], ans: 0 },
      { q: "Half-life of 80g sample after 2 half-lives:", opts: ["20 g", "40 g", "10 g", "60 g"], ans: 0 },
      { q: "Image formed by a convex mirror is always:", opts: ["Virtual, upright, diminished", "Real, inverted, enlarged", "Virtual, inverted", "Real, upright"], ans: 0 },
      { q: "Work done = force × distance × cos θ. If θ = 90°, W = ?", opts: ["0", "Max", "F×d", "Fd/2"], ans: 0 },
    ]
  }
};

const SUBJECTS = Object.keys(QUESTION_BANK);
const LEVELS = ["IGCSE", "AS Level", "A Level"];
const DIFFS = ["core", "extended"];
const TIMES: Record<string, number> = { core: 15, extended: 25 };

const gradeFromScore = (s: number) =>
  s >= 90 ? "A*" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 50 ? "D" : s >= 40 ? "E" : "U";

export default function StudentMockPage() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<"setup" | "quiz" | "result">("setup");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [diff, setDiff] = useState<"core" | "extended">("core");
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startMock = () => {
    const bank = QUESTION_BANK[subject]?.[diff] ?? QUESTION_BANK[subject]?.core ?? [];
    const shuffled = [...bank].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setAnswers(new Array(shuffled.length).fill(null));
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setTimeLeft(TIMES[diff] * 60);
    setStartTime(Date.now());
    setPhase("quiz");
  };

  useEffect(() => {
    if (phase !== "quiz") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); finishMock(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const finishMock = async () => {
    clearInterval(timerRef.current!);
    const correct = answers.filter((a, i) => a === questions[i]?.ans).length;
    const score = Math.round((correct / Math.max(questions.length, 1)) * 100);
    const grade = gradeFromScore(score);
    const taken = Math.round((Date.now() - startTime) / 60000);
    setResult({ correct, total: questions.length, score, grade, taken });
    setPhase("result");
    if (session?.user?.email) {
      setSaving(true);
      await saveMockResult({ subject, level, diff, score, grade, timeTaken: taken });
      setSaving(false);
    }
  };

  const confirm = () => {
    if (selected === null) return;
    const newAns = [...answers];
    newAns[current] = selected;
    setAnswers(newAns);
    setConfirmed(true);
  };

  const next = () => {
    if (current + 1 >= questions.length) { finishMock(); return; }
    setCurrent(c => c + 1);
    setSelected(null);
    setConfirmed(false);
  };

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const ss = (timeLeft % 60).toString().padStart(2, "0");
  const isLow = timeLeft < 120;
  const q = questions[current];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Mock Simulator</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Timed practice tests — results saved to your progress profile.</p>
      </div>

      {phase === "setup" && (
        <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 space-y-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Configure Your Test</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject</label>
              <div className="flex flex-col gap-2">
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => setSubject(s)}
                    className={`w-full p-4 text-left rounded-xl text-xs font-black uppercase border-2 transition-all ${subject === s ? "border-[var(--gold)] bg-[var(--gold)]/5 text-[var(--navy)] dark:text-white" : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--gold)]/50"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Level</label>
                <select value={level} onChange={e => setLevel(e.target.value)}
                  className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Difficulty</label>
                <select value={diff} onChange={e => setDiff(e.target.value as "core" | "extended")}
                  className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                  {DIFFS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl flex items-center gap-3">
              <Clock size={16} className="text-[var(--gold)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{TIMES[diff]} minutes · 10 questions</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Score saved to your progress profile</p>
              </div>
            </div>
            <button onClick={startMock} className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              <Play size={14} /> Start Test
            </button>
          </div>
        </div>
      )}

      {phase === "quiz" && q && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
          {/* Progress & Timer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < current ? "bg-emerald-500" : i === current ? "bg-[var(--gold)]" : "bg-[var(--border-subtle)]"}`} />
              ))}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-sm ${isLow ? "bg-red-100 text-red-700" : "bg-[var(--bg-secondary)] text-[var(--navy)] dark:text-white"}`}>
              <Clock size={14} /> {mm}:{ss}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <p className="text-[9px] font-black text-[var(--gold)] uppercase tracking-widest mb-3">Question {current+1} of {questions.length}</p>
              <h2 className="text-lg font-black text-[var(--navy)] dark:text-white leading-relaxed">{q.q}</h2>
            </div>
            <div className="space-y-3">
              {q.opts.map((opt: string, i: number) => {
                let cls = "border-[var(--border-subtle)] text-[var(--navy)] dark:text-white hover:border-[var(--gold)]";
                if (confirmed) {
                  if (i === q.ans) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700";
                  else if (i === selected && i !== q.ans) cls = "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600";
                  else cls = "border-[var(--border-subtle)] opacity-40 text-[var(--text-muted)]";
                } else if (selected === i) {
                  cls = "border-[var(--gold)] bg-[var(--gold)]/5 text-[var(--navy)] dark:text-white";
                }
                return (
                  <button key={i} onClick={() => !confirmed && setSelected(i)} disabled={confirmed}
                    className={`w-full p-4 text-left border-2 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${cls}`}>
                    <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-black shrink-0">
                      {["A","B","C","D"][i]}
                    </span>
                    {opt}
                    {confirmed && i === q.ans && <CheckCircle2 size={14} className="ml-auto text-emerald-500" />}
                    {confirmed && i === selected && i !== q.ans && <XCircle size={14} className="ml-auto text-red-500" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              {!confirmed ? (
                <button onClick={confirm} disabled={selected === null}
                  className="flex-1 py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-30">
                  Confirm Answer
                </button>
              ) : (
                <button onClick={next}
                  className="flex-1 py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
                  {current + 1 >= questions.length ? "Finish Test" : "Next Question"} <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="max-w-lg mx-auto animate-in zoom-in-95 duration-300 space-y-6">
          <div className={`bg-white dark:bg-white/5 border-2 rounded-2xl p-10 shadow-lg text-center ${result.grade.startsWith("A") ? "border-[var(--gold)]" : "border-[var(--border-subtle)]"}`}>
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 text-5xl font-black ${result.grade === "A*" ? "bg-[var(--gold)] text-black" : result.grade === "A" ? "bg-emerald-100 text-emerald-700" : result.grade.startsWith("B") || result.grade.startsWith("C") ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
              {result.grade}
            </div>
            <h2 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2">{result.score}%</h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">
              {result.correct} / {result.total} correct · {result.taken} min
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Correct", val: result.correct, color: "text-emerald-500" },
                { label: "Wrong", val: result.total - result.correct, color: "text-red-500" },
                { label: "Score", val: `${result.score}%`, color: "text-[var(--gold)]" }
              ].map((s, i) => (
                <div key={i} className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl">
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {saving && <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Saving to profile…</p>}
            {!saving && <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2"><CheckCircle2 size={12} /> Result saved to progress</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPhase("setup")} className="flex-1 py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-80 flex items-center justify-center gap-2">
                <RotateCcw size={14} /> Try Again
              </button>
              <a href="/portal/student/progress" className="flex-1 py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
                <BarChart2 size={14} /> View Progress
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

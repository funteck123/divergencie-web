"use client";

import Nav from "@/components/Nav";
import Image from "next/image";
import Footer from "@/components/Footer";
import { Play, Timer, BarChart3, Rocket, CheckCircle2, ChevronRight, ChevronLeft, Flag, Pause, X, Trophy, Target, TrendingUp, BookOpen } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── DATA: QUESTION BANK ──
const QUESTION_BANK: any = {
  igcse: {
    astar: [
      { id: 1, type: 'mcq', topic: 'Algebra', q: 'Solve for x: 3x + 12 = 30', opts: ['x = 4', 'x = 6', 'x = 8', 'x = 10'], ans: 1, marks: 1 },
      { id: 2, type: 'mcq', topic: 'Number', q: 'What is 20% of 150?', opts: ['20', '25', '30', '35'], ans: 2, marks: 1 },
      { id: 3, type: 'mcq', topic: 'Geometry', q: 'Sum of interior angles in a pentagon?', opts: ['360°', '540°', '720°', '900°'], ans: 1, marks: 1 },
      { id: 4, type: 'short', topic: 'Sequences', q: 'Find the nth term of the sequence: 5, 8, 11, 14...', marks: 2 },
      { id: 5, type: 'mcq', topic: 'Probability', q: 'Probability of rolling a prime number on a fair 6-sided die?', opts: ['1/3', '1/2', '2/3', '1/6'], ans: 1, marks: 1 },
      { id: 6, type: 'mcq', topic: 'Functions', q: 'If f(x) = 2x - 3, find f(5)', opts: ['7', '10', '13', '17'], ans: 0, marks: 1 },
      { id: 7, type: 'short', topic: 'Mensuration', q: 'Area of a circle with radius 7cm? (Use π = 22/7)', marks: 2 },
      { id: 8, type: 'mcq', topic: 'Trigonometry', q: 'In a right triangle, tan θ = 3/4. What is sin θ?', opts: ['3/5', '4/5', '5/3', '5/4'], ans: 0, marks: 1 },
      { id: 9, type: 'mcq', topic: 'Statistics', q: 'Median of the set: {4, 8, 15, 16, 23, 42}', opts: ['15', '15.5', '16', '18'], ans: 1, marks: 1 },
      { id: 10, type: 'short', topic: 'Algebra', q: 'Factorise: x² - 5x + 6', marks: 2 }
    ]
  }
};

const SUBJECTS = [
  { id: 'igcse', name: 'IGCSE', icon: '📘', sub: 'Cambridge · Grade 9–11' },
  { id: 'alevel', name: 'A Level', icon: '📗', sub: 'Cambridge · AS & A2' },
  { id: 'ap', name: 'AP', icon: '📙', sub: 'CollegeBoard · US Prep' },
  { id: 'ib', name: 'IB Diploma', icon: '📕', sub: 'IB World · DP1/2' },
  { id: 'sat', name: 'SAT / ACT', icon: '📓', sub: 'US Admissions' },
  { id: 'ielts', name: 'IELTS / TOEFL', icon: '📔', sub: 'English Proficiency' }
];

const DIFFS = [
  { id: 'foundation', name: 'Foundation', col: '#4caf50', sub: 'Grade C–B target' },
  { id: 'astar', name: 'A* Track', col: '#e8a832', sub: 'Grade A–A* target' },
  { id: 'worldtopper', name: 'World Topper', col: '#e05a4e', sub: 'Top 0.1% Globally' }
];

// TKT-0194: disabled per explicit user instruction ("disable fully with
// comment"). Block-commenting the whole component below is unsafe -- its
// JSX has several {/* ... */} comments whose "*/" would prematurely close
// an outer block comment. Instead: the real component is kept intact but
// unexported (MockPageDisabled), and this stub is the live default export.
// To re-enable: swap which function is named "MockPage" and exported.
export default function MockPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--bg-primary)] text-center px-4">
      <div>
        <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">FREE MOCK</p>
        <h1 className="text-3xl md:text-5xl font-black text-[var(--navy)] dark:text-white mb-4 uppercase">Temporarily Unavailable</h1>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">We&apos;re updating this tool. In the meantime, book a free consultation instead.</p>
      </div>
    </main>
  );
}

function MockPageDisabled() {
  const [view, setView] = useState<"landing" | "exam" | "results">("landing");
  const [config, setConfig] = useState({ subject: "", level: "", diff: "" });
  
  // Exam State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(3600);
  const [isPaused, setIsPaused] = useState(false);
  const [results, setResults] = useState<any>(null);

  // ── HANDLERS ──
  const startExam = () => {
    const qBank = QUESTION_BANK[config.subject]?.astar || QUESTION_BANK.igcse.astar;
    setQuestions(qBank);
    setCurrentQ(0);
    setAnswers({});
    setFlagged({});
    setTimeLeft(config.diff === 'worldtopper' ? 5400 : config.diff === 'astar' ? 3600 : 2700);
    setView("exam");
  };
  const submitExam = useCallback(() => {
    const mcqs = questions.filter(q => q.type === 'mcq');
    let correct = 0;
    mcqs.forEach((q, i) => {
      // Find question index in global questions array
      const qIdx = questions.findIndex(ques => ques.id === q.id);
      if (answers[qIdx] === q.ans) correct++;
    });

    const score = mcqs.length > 0 ? Math.round((correct / mcqs.length) * 100) : 100;
    const totalTime = config.diff === 'worldtopper' ? 5400 : config.diff === 'astar' ? 3600 : 2700;
    const timeTaken = totalTime - timeLeft;

    setResults({
      score,
      correct,
      total: mcqs.length,
      grade: score >= 90 ? "A*" : score >= 80 ? "A" : score >= 70 ? "B" : "C",
      timeTaken
    });
    setView("results");
  }, [questions, answers, timeLeft, config.diff]);


  const confirmSubmit = useCallback(() => {
    if (window.confirm("Are you sure you want to submit your exam?")) {
      submitExam();
    }
  }, [submitExam]);

  // Timer Effect
  useEffect(() => {
    let timer: any;
    if (view === 'exam' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && view === 'exam') {
      submitExam();
    }
    return () => clearInterval(timer);
  }, [view, isPaused, timeLeft, submitExam]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── VIEWS ──

  if (view === 'landing') return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--gold)_0%,transparent_70%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 text-[var(--gold)]">
            <Timer size={12} /> Timed · Free · No Sign-Up
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-8 uppercase leading-tight tracking-tighter">Test Yourself<br />Like It&apos;s <span className="text-[var(--gold)]">Exam Day.</span></h1>
          <p className="max-w-2xl mx-auto text-lg text-white/60 mb-12">Pick your subject, set your difficulty, and attempt a real past paper question set. Get instant results and A* gap analysis.</p>
          
          <div className="flex flex-wrap justify-center gap-12 mt-20 border-t border-white/10 pt-12">
            {[
              { val: "12k+", label: "Mocks" },
              { val: "78%", label: "Improvement" },
              { val: "Free", label: "Always" }
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black text-[var(--gold)]">{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configurator */}
      <section className="py-24 border-b border-[var(--border-subtle)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-16">
            
            {/* Step 1 */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--navy)] dark:text-white mb-8 flex items-center gap-4">
                <span className="w-8 h-8 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black flex items-center justify-center text-xs">1</span>
                Qualification
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {SUBJECTS.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setConfig({ ...config, subject: s.id, level: s.name })}
                    className={`p-8 border text-center transition-all group ${config.subject === s.id ? 'border-[var(--gold)] bg-[var(--gold-light-bg)] dark:bg-white/5' : 'border-[var(--border-subtle)] hover:border-[var(--navy)]'}`}
                  >
                    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                    <p className="text-sm font-black uppercase text-[var(--navy)] dark:text-white">{s.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className={!config.subject ? 'opacity-20 pointer-events-none' : ''}>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--navy)] dark:text-white mb-8 flex items-center gap-4">
                <span className="w-8 h-8 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black flex items-center justify-center text-xs">2</span>
                Difficulty
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {DIFFS.map(d => (
                  <button 
                    key={d.id} 
                    onClick={() => setConfig({ ...config, diff: d.id })}
                    className={`p-8 border text-left transition-all ${config.diff === d.id ? 'border-[var(--gold)] bg-[var(--gold-light-bg)] dark:bg-white/5' : 'border-[var(--border-subtle)] hover:border-[var(--navy)]'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.col }}></div>
                      <p className="text-sm font-black uppercase text-[var(--navy)] dark:text-white">{d.name}</p>
                    </div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{d.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Bar */}
            <div className={`p-10 bg-[var(--navy)] text-white flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${config.subject && config.diff ? 'opacity-100' : 'opacity-50'}`}>
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Your Session</p>
                 <p className="text-lg font-black uppercase">
                   {config.subject ? `${config.level} · ${config.diff ? DIFFS.find(d => d.id === config.diff)?.name : 'Set Difficulty'}` : 'Select Qualification Above'}
                 </p>
               </div>
               <button 
                 disabled={!config.subject || !config.diff}
                 onClick={startExam}
                 className="py-5 px-12 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-3 disabled:opacity-0 disabled:pointer-events-none"
               >
                 Start Timed Mock <Play size={14} fill="black" />
               </button>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase text-[var(--navy)] dark:text-white">How it works</h2>
            <p className="text-[var(--text-muted)] mt-4">Pressure testing your knowledge before the big day.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: <Target className="text-[var(--gold)]" />, t: "Pick Exam", d: "Choose your board and difficulty." },
              { icon: <Timer className="text-[var(--gold)]" />, t: "Timed Work", d: "Real pressure, real countdown." },
              { icon: <BarChart3 className="text-[var(--gold)]" />, t: "Instant Scan", d: "Topic-wise accuracy score." },
              { icon: <Rocket className="text-[var(--gold)]" />, t: "Fix Gaps", d: "Personalised A* roadmap." }
            ].map((step, i) => (
              <div key={i} className="p-10 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center">
                <div className="w-12 h-12 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center mx-auto mb-6">{step.icon}</div>
                <h4 className="text-sm font-black uppercase mb-2 text-[var(--navy)] dark:text-white">{step.t}</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed uppercase font-bold tracking-wider">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );

  if (view === 'exam') return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Topbar */}
      <div className="h-16 bg-[#111] border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Image src="/assets/images/logo.jpg" alt="DC" width={32} height={32} className="w-8 h-8 rounded-sm" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{config.level} · {config.diff.toUpperCase()}</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className={`text-xl font-black tabular-nums ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-[var(--gold)]'}`}>
              {formatTime(timeLeft)}
            </span>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
            </button>
          </div>
          <div className="h-8 w-[1px] bg-white/10"></div>
          <button 
            onClick={() => { if(confirm('Submit Exam?')) submitExam(); }}
            className="px-6 py-2 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
          >
            Submit Exam
          </button>
          <button onClick={() => { if(confirm('Exit Exam?')) setView('landing'); }} className="text-white/20 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-white/5">
        <div 
          className="h-full bg-[var(--gold)] transition-all duration-300" 
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#111] border-r border-white/5 p-8 overflow-y-auto hidden md:block">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-8">Questions</p>
          <div className="grid grid-cols-4 gap-3">
            {questions.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`aspect-square text-[10px] font-black flex items-center justify-center border transition-all ${
                  currentQ === i ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 
                  flagged[i] ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                  answers[i] !== undefined ? 'bg-[var(--navy)] text-white border-white/10' : 'bg-white/5 text-white/20 border-white/5'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <div className="mt-12 space-y-4">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/30">
               <div className="w-3 h-3 bg-[var(--gold)]"></div> Current
             </div>
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/30">
               <div className="w-3 h-3 bg-[var(--navy)]"></div> Answered
             </div>
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/30">
               <div className="w-3 h-3 bg-red-500"></div> Flagged
             </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 p-8 md:p-20 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <p className="text-[var(--gold)] text-[10px] font-black uppercase tracking-widest mb-2">{questions[currentQ].topic}</p>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Question {currentQ + 1} of {questions.length}</h3>
              </div>
              <button 
                onClick={() => setFlagged({ ...flagged, [currentQ]: !flagged[currentQ] })}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${flagged[currentQ] ? 'text-red-500' : 'text-white/30 hover:text-white'}`}
              >
                <Flag size={14} /> {flagged[currentQ] ? 'Unflag' : 'Flag Question'}
              </button>
            </div>

            <div className="text-2xl md:text-3xl font-medium leading-relaxed mb-16 text-white/90">
              {questions[currentQ].q}
            </div>

            {questions[currentQ].type === 'mcq' ? (
              <div className="space-y-4">
                {questions[currentQ].opts.map((opt: string, i: number) => (
                  <button 
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQ]: i })}
                    className={`w-full p-8 text-left border transition-all flex items-start gap-6 group ${answers[currentQ] === i ? 'bg-white/5 border-[var(--gold)]' : 'bg-white/2 border-white/5 hover:border-white/20'}`}
                  >
                    <div className={`w-8 h-8 shrink-0 flex items-center justify-center font-black text-[10px] border transition-colors ${answers[currentQ] === i ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-white/5 text-white/40 border-white/10 group-hover:border-white/30'}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={`text-lg transition-colors ${answers[currentQ] === i ? 'text-white' : 'text-white/60'}`}>{opt}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <textarea 
                  value={answers[currentQ] || ""}
                  onChange={(e) => setAnswers({ ...answers, [currentQ]: e.target.value })}
                  rows={8}
                  placeholder="Type your answer here..."
                  className="w-full p-8 bg-white/2 border border-white/10 text-xl text-white outline-none focus:border-[var(--gold)] transition-colors resize-none"
                ></textarea>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Marks Available: {questions[currentQ].marks}</p>
              </div>
            )}

            <div className="mt-20 pt-12 border-t border-white/5 flex items-center justify-between">
              <button 
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(prev => prev - 1)}
                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-0"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/20">
                {Object.keys(answers).length} of {questions.length} Answered
              </div>
              <button 
                onClick={() => currentQ === questions.length - 1 ? confirmSubmit() : setCurrentQ(prev => prev + 1)}
                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--gold)] hover:text-white transition-colors"
              >
                {currentQ === questions.length - 1 ? "Review All" : "Next Question"} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
           <h2 className="text-5xl font-black uppercase mb-4">Exam Paused</h2>
           <p className="text-white/40 text-lg mb-12 max-w-md">Timer stopped. Your progress is saved. Resume whenever you&apos;re ready.</p>
           <button 
             onClick={() => setIsPaused(false)}
             className="py-6 px-16 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-4"
           >
             Resume Exam <Play size={16} fill="black" />
           </button>
        </div>
      )}
    </div>
  );

  if (view === 'results') return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 md:p-24 overflow-y-auto">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-12">
          <div className="w-24 h-24 bg-[var(--gold)]/10 border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-8 text-5xl">
            {results.score >= 80 ? <Trophy className="text-[var(--gold)]" size={48} /> : <BookOpen className="text-[var(--gold)]" size={48} />}
          </div>
          <h1 className="text-6xl font-black uppercase mb-4 tracking-tighter">
            {results.score >= 90 ? "Outstanding" : results.score >= 80 ? "Great Effort" : "Keep Pushing"}
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-sm">
            {config.level} · {config.diff.toUpperCase()} · Completed in {Math.floor(results.timeTaken / 60)}m {results.timeTaken % 60}s
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-10 bg-white/2 border border-white/5">
            <p className="text-6xl font-black text-[var(--gold)] mb-2">{results.score}%</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Accuracy Rate</p>
          </div>
          <div className="p-10 bg-white/2 border border-white/5">
            <p className="text-6xl font-black text-white mb-2">{results.grade}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Projected Grade</p>
          </div>
          <div className="p-10 bg-white/2 border border-white/5">
            <p className="text-6xl font-black text-white mb-2">{results.correct}/{results.total}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">MCQ Correct</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-10 bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-16 text-left">
           <div className="flex items-center gap-4 mb-6 text-[var(--gold)]">
             <TrendingUp size={24} />
             <h3 className="text-xl font-black uppercase">A* Gap Analysis</h3>
           </div>
           <p className="text-white/70 leading-relaxed mb-8">
             Based on your performance in <strong>{config.level}</strong>, you are currently in the <strong>top {100 - results.score}%</strong> of candidates. To bridge the gap to a guaranteed A*, focus on <strong>{results.score < 80 ? "foundational topics" : "high-difficulty problem solving"}</strong>.
           </p>
           <div className="flex flex-wrap gap-4">
             <button onClick={() => setView('landing')} className="py-4 px-10 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Retake Mock</button>
             <Link href="/contact" className="py-4 px-10 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Get Personalised Plan</Link>
           </div>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Results are based on MCQ performance. Short answers require manual grading by a DivergenCIE tutor.</p>
      </div>
    </main>
  );

  return null;
}

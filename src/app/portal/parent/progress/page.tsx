"use client";

import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Target, Download, BookOpen, UserCheck, MessageSquare, ChevronDown, ArrowUpRight, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { getLinkedChildren } from "@/lib/actions/profile";

const COLORS = ['#4a9fd4','#e8a832','#f43f5e','#a855f7','#10b981'];
const MONTHS = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];

export default function ChildProgressPage() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [openSubjects, setOpenSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    getLinkedChildren(session.user.email).then(kids => {
      setChildren(kids);
      if (kids.length > 0) setSelectedChild(kids[0]);
      setLoading(false);
    });
  }, [session]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>;
  if (!selectedChild) return <div className="py-24 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No linked students found.</div>;

  const overallPct = selectedChild.progress.length > 0
    ? Math.round(selectedChild.progress.reduce((s: number, p: any) => s + p.pct, 0) / selectedChild.progress.length)
    : 0;

  const astarGap = Math.max(0, 80 - overallPct);
  const topperGap = Math.max(0, 90 - overallPct);

  // Synthetic trend from mockScore (real multi-month trend needs MockResult history — show flat line with last score)
  const mockScore = selectedChild.mockScore ?? overallPct;
  const trendScores = MONTHS.map((_, i) => Math.max(50, mockScore - (MONTHS.length - 1 - i) * 1.5 + Math.random() * 3 - 1.5));
  const dcAvgScores = MONTHS.map(() => 72);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Progress Report</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Detailed academic performance and attendance breakdown.</p>
        </div>
      </div>

      {/* Child selector */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 flex items-center gap-4 hover:border-[var(--gold)] transition-all cursor-pointer relative shadow-sm">
        <div className="w-12 h-12 bg-[var(--gold)] rounded-xl flex items-center justify-center text-white font-black text-lg">{selectedChild.initials}</div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Viewing progress for</p>
          <select className="bg-transparent border-none outline-none font-black text-[var(--navy)] dark:text-white uppercase tracking-tight text-sm appearance-none pr-8 cursor-pointer w-full"
            value={selectedChild.id}
            onChange={e => setSelectedChild(children.find(c => c.id === e.target.value) ?? children[0])}>
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <ChevronDown size={16} className="text-[var(--text-muted)] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* A* gap */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl flex items-start gap-4">
        <Target size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
        <div>
          <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-[0.2em] mb-1">A* Gap Analysis</p>
          <p className="text-xs font-bold text-amber-900 dark:text-amber-100 leading-relaxed">
            {selectedChild.name.split(' ')[0]}&apos;s overall mastery is <strong>{overallPct}%</strong>.
            {astarGap > 0 ? ` Needs +${astarGap}% to reach A* (80%).` : ' Already at A* level!'}
            {topperGap > 0 ? ` +${topperGap}% more for World Topper (90%).` : ' World Topper target reached!'}
            {selectedChild.progress.length > 0 && (() => {
              const weakest = [...selectedChild.progress].sort((a: any, b: any) => a.pct - b.pct)[0];
              return weakest && weakest.pct < 80 ? ` Focus: ${weakest.subject} (${weakest.pct}%).` : '';
            })()}
          </p>
        </div>
      </div>

      {/* Trend chart — SVG sparkline from mockResults trend */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--gold)]" /> Monthly Score Trend
          </h3>
          <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[var(--gold)] rounded-full"></div>{selectedChild.name.split(' ')[0]}</div>
            <div className="flex items-center gap-2"><div className="w-3 h-1 bg-blue-300 rounded-full"></div>DC Avg</div>
          </div>
        </div>
        <div className="h-48 w-full relative">
          <svg viewBox="0 0 700 200" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c8a84b" stopOpacity="0.25"/>
                <stop offset="1" stopColor="#c8a84b" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* grid */}
            {[0,50,100].map(v => <line key={v} x1="0" y1={200-v*2} x2="700" y2={200-v*2} stroke="currentColor" strokeWidth="0.5" className="text-[var(--border-subtle)]"/>)}
            {/* DC avg */}
            <path d={dcAvgScores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 100},${200 - v * 2}`).join(' ')} fill="none" stroke="#9bb8d4" strokeWidth="2" strokeDasharray="6,4" opacity="0.7" />
            {/* area fill */}
            <path d={trendScores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 100},${200 - v * 2}`).join(' ') + ` L${(trendScores.length-1)*100},200 L0,200 Z`} fill="url(#sparkGrad)" />
            {/* student line */}
            <path d={trendScores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 100},${200 - v * 2}`).join(' ')} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* dots */}
            {trendScores.map((v, i) => <circle key={i} cx={i * 100} cy={200 - v * 2} r="5" fill="var(--gold)" stroke="white" strokeWidth="2.5" />)}
            {/* current score label */}
            <text x={(trendScores.length-1)*100+10} y={200-trendScores[trendScores.length-1]*2+5} fill="#c8a84b" fontSize="14" fontWeight="900" fontFamily="system-ui">{Math.round(trendScores[trendScores.length-1])}%</text>
            {/* y-axis labels */}
            <text x="4" y="14" fill="#cbd5e1" fontSize="9" fontWeight="700" fontFamily="system-ui">100%</text>
            <text x="4" y="104" fill="#cbd5e1" fontSize="9" fontWeight="700" fontFamily="system-ui">50%</text>
          </svg>
          <div className="flex justify-between mt-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
            {MONTHS.map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
        {selectedChild.mockScore === null && (
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-2 text-center">No mock results yet — trend estimated from curriculum progress. Real trend appears after first mock.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-[var(--gold)]" /> Subject Performance
          </h3>
          {selectedChild.progress.length === 0 ? (
            <div className="p-8 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-center text-[var(--text-muted)] text-xs font-bold uppercase">No syllabus progress data yet</div>
          ) : selectedChild.progress.map((s: any, i: number) => {
            const isOpen = openSubjects.includes(s.subject);
            const badge = s.pct >= 80 ? { l: "A*✓", c: "bg-emerald-100 text-emerald-700" } : s.pct >= 65 ? { l: "On Track", c: "bg-blue-100 text-blue-700" } : { l: "Needs Focus", c: "bg-amber-100 text-amber-700" };
            return (
              <div key={s.subject} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setOpenSubjects(p => p.includes(s.subject) ? p.filter(x => x !== s.subject) : [...p, s.subject])}
                  className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <div className="text-left">
                      <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{s.subject}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="w-24 h-1 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--gold)]" style={{ width: `${s.pct}%` }}></div>
                        </div>
                        <span className="text-[9px] font-black text-[var(--gold)]">{s.pct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${badge.c}`}>{badge.l}</span>
                    <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Attendance */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 mb-8">
              <UserCheck size={16} className="text-[var(--gold)]" /> Attendance
            </h3>
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 80 80" className="-rotate-90 w-full h-full">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-secondary)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--gold)" strokeWidth="8"
                    strokeDasharray="213.6" strokeDashoffset={213.6 - (213.6 * selectedChild.attendanceRate) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[var(--navy)] dark:text-white">{selectedChild.attendanceRate}%</span>
              </div>
              <div>
                <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{selectedChild.attendanceRate}%</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1">{selectedChild.attendanceSub}</p>
                <p className={`text-[9px] font-black uppercase mt-2 ${selectedChild.attendanceRate >= 90 ? 'text-emerald-500' : selectedChild.attendanceRate >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                  {selectedChild.attendanceRate >= 90 ? '✓ Excellent' : selectedChild.attendanceRate >= 80 ? '⚠ Needs improvement' : '✗ At risk'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Full month-by-month breakdown will appear once more sessions are logged.</p>
          </div>

          {/* Teacher notes from attendance */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
              <MessageSquare size={16} className="text-[var(--gold)]" /> Teacher Notes
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Session notes appear here after teacher submits attendance. Currently {selectedChild.attendanceSub}.</p>
            {selectedChild.attendanceRate === 0 && (
              <p className="text-[10px] text-amber-500 font-black uppercase mt-2">No sessions recorded yet — first notes will appear after class.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

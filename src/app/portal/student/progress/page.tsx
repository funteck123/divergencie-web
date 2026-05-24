"use client";

import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Target, BookOpen, CheckCircle2, ChevronDown, Star, Download, AlertCircle, Loader2 } from "lucide-react";
import { getStudentProgressStats, getStudentProgress, getSyllabusItems } from "@/lib/actions/progress";
import { useSession } from "next-auth/react";

export default function StudentProgressPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [bySubject, setBySubject] = useState<any[]>([]);
  const [openSubjects, setOpenSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    const load = async () => {
      setLoading(true);
      const [s, progress, syllabus] = await Promise.all([
        getStudentProgressStats(session.user!.email!),
        getStudentProgress(session.user!.email!),
        getSyllabusItems()
      ]);
      setStats(s);

      // group by subject
      const progMap: Record<string, boolean> = {};
      for (const p of progress) { progMap[p.syllabusItemId] = p.completed; }
      const subjMap: Record<string, { total: number; done: number; items: any[] }> = {};
      for (const item of syllabus) {
        if (!subjMap[item.subject]) subjMap[item.subject] = { total: 0, done: 0, items: [] };
        subjMap[item.subject].total++;
        if (progMap[item.id]) subjMap[item.subject].done++;
        subjMap[item.subject].items.push({ ...item, completed: progMap[item.id] ?? false });
      }

      const COLORS = ['#3b82f6','var(--gold)','#f43f5e','#a855f7','#10b981'];
      const rows = Object.entries(subjMap).map(([name, { total, done, items }], i) => ({
        name, pct: total > 0 ? Math.round((done / total) * 100) : 0,
        color: COLORS[i % COLORS.length], done, total, items
      }));
      setBySubject(rows);
      setLoading(false);
    };
    load();
  }, [session]);

  const overallPct = bySubject.length > 0 ? Math.round(bySubject.reduce((s, r) => s + r.pct, 0) / bySubject.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Academic Progress</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Comprehensive tracking of your mastery across all subjects.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Overall Mastery", val: `${overallPct}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
              { label: "Mock Score", val: stats ? `${stats.mockScore}%` : "—", icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
              { label: "Attendance Rate", val: stats ? `${stats.attendanceRate}%` : "—", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
                <div className={`w-10 h-10 ${s.bg} dark:bg-white/10 rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-3xl font-black text-[var(--navy)] dark:text-white mb-1">{s.val}</p>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Subject breakdown */}
          {bySubject.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase">No syllabus data yet</div>
          ) : (
            <div className="space-y-4">
              {bySubject.map((subj: any) => {
                const isOpen = openSubjects.includes(subj.name);
                const badge = subj.pct >= 80 ? { label: "A*✓", cls: "bg-emerald-100 text-emerald-700" }
                  : subj.pct >= 60 ? { label: "On Track", cls: "bg-blue-100 text-blue-700" }
                  : { label: "Needs Attention", cls: "bg-amber-100 text-amber-700" };
                return (
                  <div key={subj.name} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 flex items-center gap-6 cursor-pointer hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5"
                      onClick={() => setOpenSubjects(p => p.includes(subj.name) ? p.filter(x => x !== subj.name) : [...p, subj.name])}>
                      <div className="w-1.5 h-16 rounded-full shrink-0" style={{ backgroundColor: subj.color }}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{subj.name}</h3>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${subj.pct}%`, backgroundColor: subj.color }}></div>
                          </div>
                          <span className="text-xs font-black text-[var(--navy)] dark:text-white w-12 text-right">{subj.pct}%</span>
                        </div>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-2">{subj.done}/{subj.total} chapters complete</p>
                      </div>
                      <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isOpen && (
                      <div className="border-t border-[var(--border-subtle)] p-6 grid md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                        {subj.items.map((item: any) => (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${item.completed ? 'opacity-60 bg-[var(--bg-secondary)] dark:bg-white/5' : 'bg-[var(--bg-secondary)] dark:bg-white/5 hover:border-[var(--gold)]'}`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.completed ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'border-[var(--border-subtle)]'}`}>
                              {item.completed && <CheckCircle2 size={12} />}
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase ${item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--navy)] dark:text-white'}`}>{item.title}</p>
                              <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{item.milestone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

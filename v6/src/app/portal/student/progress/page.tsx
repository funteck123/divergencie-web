"use client";

import { useState, useEffect } from "react";
import { 
  BarChart2, 
  TrendingUp, 
  Target, 
  BookOpen, 
  CheckCircle2, 
  ChevronDown, 
  Star, 
  Download, 
  AlertCircle, 
  Loader2,
  FileText,
  FileCheck,
  Calendar,
  MessageSquare
} from "lucide-react";
import { 
  getStudentProgressStats, 
  getStudentProgress, 
  getSyllabusItems,
  getStudentProgressReports 
} from "@/lib/actions/progress";
import { useSession } from "@/lib/auth-client";

export default function StudentProgressPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");
  
  // Progress states
  const [stats, setStats] = useState<any>(null);
  const [bySubject, setBySubject] = useState<any[]>([]);
  const [openSubjects, setOpenSubjects] = useState<string[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const [s, progress, syllabus, reportsData] = await Promise.all([
        getStudentProgressStats(session.user.email),
        getStudentProgress(session.user.email),
        getSyllabusItems(),
        getStudentProgressReports(session.user.email)
      ]);
      setStats(s);
      setReports(reportsData);

      // group by subject
      const progMap: Record<string, boolean> = {};
      for (const p of progress) { 
        progMap[p.syllabusItemId] = p.completed; 
      }
      
      const subjMap: Record<string, { total: number; done: number; items: any[] }> = {};
      for (const item of syllabus) {
        const subjectName = item.subject || "General";
        if (!subjMap[subjectName]) {
          subjMap[subjectName] = { total: 0, done: 0, items: [] };
        }
        subjMap[subjectName].total++;
        if (progMap[item.id]) {
          subjMap[subjectName].done++;
        }
        subjMap[subjectName].items.push({ ...item, completed: progMap[item.id] ?? false });
      }

      const COLORS = ['#3b82f6', '#e8a832', '#ef4444', '#a855f7', '#10b981'];
      const rows = Object.entries(subjMap).map(([name, { total, done, items }], i) => ({
        name, 
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        color: COLORS[i % COLORS.length], 
        done, 
        total, 
        items
      }));
      setBySubject(rows);
    } catch (err) {
      console.error("Failed to load progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadData();
    }
  }, [session]);

  const overallPct = bySubject.length > 0 ? Math.round(bySubject.reduce((s, r) => s + r.pct, 0) / bySubject.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Academic Progress</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Comprehensive tracking of your syllabus mastery and monthly reports.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-subtle)] dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-[var(--navy)] text-white shadow-sm" : "bg-white dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
        >
          Mastery Overview
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === "reports" ? "bg-[var(--navy)] text-white shadow-sm" : "bg-white dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
        >
          Monthly Reports
          {reports.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === "reports" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
        </div>
      ) : activeTab === "overview" ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Overall Mastery", val: `${overallPct}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Mock Score", val: stats ? `${stats.mockScore}%` : "—", icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
              { label: "Attendance Rate", val: stats ? `${stats.attendanceRate}%` : "—", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-3xl font-black text-[var(--navy)] dark:text-white mb-1">{s.val}</p>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Subject breakdown */}
          {bySubject.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase">No syllabus data yet</div>
          ) : (
            <div className="space-y-4">
              {bySubject.map((subj: any) => {
                const isOpen = openSubjects.includes(subj.name);
                const badge = subj.pct >= 80 ? { label: "A*✓", cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" }
                  : subj.pct >= 60 ? { label: "On Track", cls: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" }
                  : { label: "Needs Attention", cls: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" };
                return (
                  <div key={subj.name} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
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
                      <div className="border-t border-[var(--border-subtle)] dark:border-white/10 p-6 grid md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200 bg-[var(--bg-secondary)]/10 dark:bg-black/10">
                        {subj.items.map((item: any) => (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border border-[var(--border-subtle)] dark:border-white/10 ${item.completed ? 'opacity-60 bg-[var(--bg-secondary)] dark:bg-white/5' : 'bg-white dark:bg-white/5 hover:border-[var(--gold)]'}`}>
                            <div className={`w-5.5 h-5.5 rounded border-2 flex items-center justify-center shrink-0 ${item.completed ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'border-[var(--border-subtle)]'}`}>
                              {item.completed && <CheckCircle2 size={12} />}
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase ${item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--navy)] dark:text-white'}`}>
                                {item.topicCode ? `${item.topicCode} ` : ""}{item.topicTitle}
                              </p>
                              <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{item.level} · {item.chapterTitle || "Syllabus"}</p>
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
      ) : (
        /* Progress Reports list */
        <div className="space-y-6">
          {reports.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
              No progress reports published yet.
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => {
                const metricsObj = (report.metricSnapshot?.metrics || {}) as any;
                return (
                  <div 
                    key={report.id} 
                    className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
                  >
                    {/* Report Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] dark:border-white/10 pb-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                          <FileCheck size={22} />
                        </div>
                        <div>
                          <h4 className="text-base font-black uppercase tracking-tight text-[var(--navy)] dark:text-white">
                            Progress Report — {report.month}
                          </h4>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5 mt-1">
                            <Calendar size={12} /> Published on {report.sentAt ? new Date(report.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                      </div>
                      
                      {report.pdfLink && (
                        <a
                          href={report.pdfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-4 bg-[var(--navy)] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors hover:opacity-90 flex items-center justify-center gap-2 self-start sm:self-center shadow-sm"
                        >
                          <Download size={13} /> Download PDF
                        </a>
                      )}
                    </div>

                    {/* Snapshot Metrics Grid */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Performance Metrics</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Attendance Rate", val: metricsObj.attendanceRate !== undefined ? `${metricsObj.attendanceRate}%` : "—" },
                          { label: "Syllabus Mastery", val: metricsObj.syllabusCompletion !== undefined ? `${metricsObj.syllabusCompletion}%` : "—" },
                          { label: "Avg Mastery Level", val: metricsObj.avgMasteryPct !== undefined ? `${metricsObj.avgMasteryPct}%` : "—" },
                          { label: "Task Completion", val: metricsObj.taskCompletionRate !== undefined ? `${metricsObj.taskCompletionRate}%` : "—" },
                          { label: "Avg Task Score", val: metricsObj.avgTaskScore !== undefined ? `${metricsObj.avgTaskScore}%` : "—" },
                          { label: "Avg Mock Score", val: metricsObj.avgMockScore !== undefined ? `${metricsObj.avgMockScore}%` : "—" },
                          { label: "No-Shows", val: metricsObj.noShowCount !== undefined ? metricsObj.noShowCount : "0" },
                          { label: "Payment Status", val: metricsObj.paymentStatus || "—" },
                        ].map((m, idx) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)]/50 dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">{m.label}</p>
                            <p className="text-lg font-black text-[var(--navy)] dark:text-white uppercase">{m.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Staff Comments */}
                    {report.staffComments && (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                        <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <MessageSquare size={13} /> Coach Comments & Guidance
                        </h5>
                        <p className="text-xs text-[var(--text-muted)] dark:text-gray-300 leading-relaxed font-medium">
                          {report.staffComments}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

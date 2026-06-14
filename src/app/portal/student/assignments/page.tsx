"use client";

import { useState, useEffect } from "react";
import { ClipboardList, History, CheckSquare, Send, Upload, FileText, CheckCircle2, Clock, AlertCircle, X, Star, Download, Filter, Loader2 } from "lucide-react";
import { getStudentAssignments, submitAssignment } from "@/lib/actions/progress";
import { useSession } from "@/lib/auth-client";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

const SUBJECT_COLORS = ["#4a9fd4", "var(--gold)", "#f43f5e", "#a855f7", "#10b981"];

export default function StudentAssignmentsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("active");
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionText, setSubmissionText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    const a = await getStudentAssignments(session.user.email);
    setAssignments(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleSubmit = async () => {
    if (!selectedAssignment || !submissionText) return;
    setSaving(true);
    await submitAssignment(selectedAssignment.id, submissionText);
    setIsSubmitOpen(false);
    setSubmissionText("");
    await load();
    setSaving(false);
  };

  const active = assignments.filter(a => ["pending", "overdue"].includes(a.status));
  const history = assignments.filter(a => ["submitted", "graded"].includes(a.status));

  const dueLabel = (due: string) => {
    const d = new Date(due);
    const today = new Date();
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
    if (diff === 0) return { label: "Due Today", cls: "bg-red-100 text-red-700" };
    if (diff <= 3) return { label: `Due in ${diff}d`, cls: "bg-amber-100 text-amber-700" };
    return { label: new Date(due).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), cls: "bg-blue-100 text-blue-700" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Assignments</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Track your coursework, submit papers, and review graded feedback.</p>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[{ id: "active", label: "Active", icon: ClipboardList }, { id: "history", label: "History", icon: History }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : activeTab === "active" ? (
        active.length === 0 ? (
          <div className="py-24 text-center text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">No active assignments — great job!</div>
        ) : (
          <div className="grid gap-4 animate-in fade-in duration-300">
            {active.map((a: any, i: number) => {
              const due = dueLabel(a.dueDate);
              return (
                <div key={a.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-2.5 h-12 rounded-full shrink-0" style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}></div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{a.title}</h3>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${due.cls}`}>{due.label}</span>
                        </div>
                        <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed max-w-2xl">{a.description ?? "—"}</p>
                        <p className="text-[9px] font-black text-[var(--gold)] uppercase tracking-widest mt-2">{a.subject}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedAssignment(a); setIsSubmitOpen(true); }}
                      className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
                      <Send size={14} /> Submit Work
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-[var(--gold)]" /> Submission History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Assignment</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-[var(--text-muted)] uppercase">No submission history yet</td></tr>
                ) : history.map((a: any) => (
                  <tr key={a.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{a.title}</td>
                    <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[9px]">{a.subject}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-700"}`}>{a.status}</span>
                    </td>
                    <td className="px-6 py-5">
                      {a.grade ? <span className="flex items-center gap-1 text-[var(--gold)] font-black uppercase text-[10px]"><Star size={12} fill="var(--gold)" />{a.grade}</span> : <span className="text-[var(--text-muted)] text-[10px] italic">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Submit Assignment</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{selectedAssignment?.title}</p>
              </div>
              <button onClick={() => setIsSubmitOpen(false)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full"><X size={20} className="text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Submission Link or Note</label>
                <textarea rows={4} value={submissionText} onChange={e => setSubmissionText(e.target.value)}
                  placeholder="Paste GCR link, Drive link, or describe your submission..."
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
              <button onClick={handleSubmit} disabled={saving || !submissionText}
                className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit Final Work
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

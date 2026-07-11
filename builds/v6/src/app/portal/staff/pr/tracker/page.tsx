"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, MessageCircle, User, Clock, Loader2, RefreshCw, Shield } from "lucide-react";
import { getTeacherSubmissionStatus, getAtRiskStudents } from "@/lib/actions/attendance";

export default function PRTrackerPage() {
  const [activeTab, setActiveTab] = useState("teachers");
  const [overdueTeachers, setOverdueTeachers] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [ot, ar] = await Promise.all([getTeacherSubmissionStatus(), getAtRiskStudents()]);
    setOverdueTeachers(ot);
    setAtRisk(ar);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const waMessage = (name: string, type: "teacher" | "student") =>
    type === "teacher"
      ? `Hi ${name}, your post-class submission is overdue (>24h). Please submit whiteboard link, duration, and attendance on the portal asap.`
      : `Hi ${name}, our team noticed some activity gaps in your portal. Please ensure you're attending classes and submitting assignments. Let us know if you need support.`;

  const riskColor = (score: number) =>
    score >= 3 ? "bg-red-100 text-red-700" : score === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">PR Tracker</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Teacher submission SLA + at-risk student monitoring.</p>
        </div>
        <button onClick={load} className="px-5 py-2.5 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-[var(--gold)] transition-all flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-2xl border flex items-center gap-4 ${overdueTeachers.length > 0 ? "bg-red-50 dark:bg-red-900/10 border-red-200" : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200"}`}>
            <AlertTriangle size={24} className={overdueTeachers.length > 0 ? "text-red-500" : "text-emerald-500"} />
            <div>
              <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{overdueTeachers.length}</p>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Overdue Submissions (&gt;24h)</p>
            </div>
          </div>
          <div className={`p-5 rounded-2xl border flex items-center gap-4 ${atRisk.length > 0 ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200" : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200"}`}>
            <Shield size={24} className={atRisk.length > 0 ? "text-amber-500" : "text-emerald-500"} />
            <div>
              <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{atRisk.length}</p>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">At-Risk Students</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[
          { id: "teachers", label: `Teacher SLA${overdueTeachers.length > 0 ? ` (${overdueTeachers.length})` : ""}` },
          { id: "students", label: `At-Risk Students${atRisk.length > 0 ? ` (${atRisk.length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : activeTab === "teachers" ? (
        overdueTeachers.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">All teachers are on time — no overdue submissions.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Overdue Post-Class Submissions — 24h SLA Breached</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Session Ended</th>
                    <th className="px-6 py-4 text-right">Remind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {overdueTeachers.map((s: any) => {
                    const hoursAgo = Math.floor((Date.now() - new Date(s.endTime).getTime()) / 3600000);
                    return (
                      <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                        <td className="px-6 py-5">
                          <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{s.teacher?.name ?? "—"}</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">{s.teacher?.email}</p>
                        </td>
                        <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.student?.name ?? "—"}</td>
                        <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.subject}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-red-500" />
                            <span className="font-black text-red-500 text-[10px]">{hoursAgo}h ago</span>
                          </div>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold mt-0.5">{new Date(s.endTime).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waMessage(s.teacher?.name ?? "", "teacher"))}`, "_blank")}
                            className="px-3 py-1.5 bg-green-100 text-green-700 text-[8px] font-black uppercase rounded-full hover:opacity-90 flex items-center gap-1 ml-auto">
                            <MessageCircle size={10} /> WA Remind
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        atRisk.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No at-risk students — all students are on track.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">At-Risk Students — Flagged by System</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Risk</th>
                    <th className="px-6 py-4">Flags</th>
                    <th className="px-6 py-4">Attendance</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {atRisk.map((s: any) => (
                    <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-5">
                        <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{s.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)] font-bold">{s.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${riskColor(s.riskScore)}`}>
                          {s.riskScore === 3 ? "High" : s.riskScore === 2 ? "Medium" : "Low"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          {s.flags.map((f: string, i: number) => (
                            <span key={i} className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`font-black text-[10px] ${s.attRate < 80 ? "text-red-500" : "text-emerald-500"}`}>{s.attRate}%</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`font-black text-[10px] ${s.progressPct < 50 ? "text-red-500" : "text-emerald-500"}`}>{s.progressPct}%</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waMessage(s.name, "student"))}`, "_blank")}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-full hover:opacity-90 flex items-center gap-1 ml-auto">
                          <MessageCircle size={10} /> WA Check-in
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

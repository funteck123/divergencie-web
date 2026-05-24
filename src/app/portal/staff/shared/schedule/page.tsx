"use client";

import { useState, useEffect } from "react";
import { Calendar, UserCheck, AlertTriangle, Clock, MessageCircle, MoreVertical, Plus, CheckCircle2, RefreshCcw, Loader2 } from "lucide-react";
import { getAllSchedule, getMissedSessions, rescheduleSession } from "@/lib/actions/mapping";

export default function StaffSchedulePage() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [groups, setGroups] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");

  const load = async () => {
    setLoading(true);
    const [g, m] = await Promise.all([getAllSchedule(), getMissedSessions()]);
    setGroups(g);
    setMissed(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Schedule</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Teacher-student assignments and missed session tracker.</p>
        </div>
        <a href="/portal/staff/pr/mapping" className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg">
          <Plus size={14} /> Manage Mappings
        </a>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[{ id: "schedule", label: "Groups & Assignments" }, { id: "missed", label: `Missed Sessions${missed.length > 0 ? ` (${missed.length})` : ""}` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : activeTab === "schedule" ? (
        groups.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
            <Calendar size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">No groups yet.</p>
            <a href="/portal/staff/pr/mapping" className="text-[10px] font-black text-[var(--gold)] uppercase hover:underline">Create first mapping →</a>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Group Code</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Students</th>
                    <th className="px-6 py-4">Next Session</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {groups.map((g: any) => {
                    const next = g.sessions.find((s: any) => s.status === 'scheduled');
                    return (
                      <tr key={g.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                        <td className="px-6 py-5">
                          <span className="px-2 py-1 bg-[var(--navy)] text-white text-[9px] font-black uppercase rounded-lg">{g.code}</span>
                        </td>
                        <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{g.subject}</td>
                        <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{g.teacher?.name ?? "—"}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-0.5">
                            {g.students.slice(0,3).map((s: any) => (
                              <span key={s.id} className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{s.name}</span>
                            ))}
                            {g.students.length > 3 && <span className="text-[8px] text-[var(--gold)] font-black">+{g.students.length - 3} more</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {next ? (
                            <div>
                              <p className="text-[10px] font-black text-[var(--navy)] dark:text-white uppercase">{new Date(next.startTime).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"})}</p>
                              <p className="text-[9px] font-bold text-[var(--text-muted)]">{new Date(next.startTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                            </div>
                          ) : <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">No upcoming</span>}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg text-[var(--text-muted)]"><MoreVertical size={16} /></button>
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
        missed.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No missed sessions in the last 7 days.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {missed.map((s: any) => (
                    <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{new Date(s.startTime).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.student?.name ?? "—"}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.subject}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.teacher?.name ?? "—"}</td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => setRescheduling(s.id)} className="px-3 py-1 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-full hover:opacity-90 flex items-center gap-1 ml-auto">
                          <RefreshCcw size={10} /> Reschedule
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

      {/* Reschedule modal */}
      {rescheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-2xl p-8 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-widest">Reschedule Session</h3>
            <input type="datetime-local" value={newTime} onChange={e => setNewTime(e.target.value)}
              className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <div className="flex gap-3">
              <button onClick={async () => {
                if (!newTime) return;
                await rescheduleSession(rescheduling, new Date(newTime));
                setRescheduling(null); setNewTime(""); await load();
              }} className="flex-1 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl">Confirm</button>
              <button onClick={() => setRescheduling(null)} className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { CalendarCheck, Clock, Users, History, Plus, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { logStaffAttendance, getStaffAttendanceLogs, getAllSubmissions } from "@/lib/actions/attendance";
import { useSession } from "next-auth/react";

const SESSION_TYPES = ["Meeting","Training","Workshop","PR Review","Student Check-in","Other"];

export default function StaffAttendancePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("log");
  const [history, setHistory] = useState<any[]>([]);
  const [allSubs, setAllSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "Meeting", date: new Date().toISOString().slice(0,16), startTime: "", endTime: "", notes: "" });

  const calcDuration = (s: string, e: string) => {
    if (!s || !e) return 0;
    const diff = (new Date(`2000-01-01T${e}`).getTime() - new Date(`2000-01-01T${s}`).getTime()) / 3600000;
    return Math.max(0, diff);
  };

  const load = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    const [h, all] = await Promise.all([
      getStaffAttendanceLogs(session.user.email),
      getAllSubmissions()
    ]);
    setHistory(h);
    setAllSubs(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleSubmit = async () => {
    if (!form.title || !form.date) { setError("Title and date required"); return; }
    if (!session?.user?.email) return;
    setSaving(true); setError(null);
    try {
      const duration = form.startTime && form.endTime ? calcDuration(form.startTime, form.endTime) : 1;
      await logStaffAttendance({
        userEmail: session.user.email,
        title: form.title,
        type: form.type,
        date: new Date(form.date),
        duration,
        notes: form.notes || undefined,
      });
      setSuccess(true);
      setForm({ title: "", type: "Meeting", date: new Date().toISOString().slice(0,16), startTime: "", endTime: "", notes: "" });
      await load();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const user = session?.user as any;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Attendance Log</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Log meetings, training, and sessions for monthly claim submission.</p>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[
          { id: "log", label: "Log Entry", icon: Plus },
          { id: "history", label: "My History", icon: History },
          { id: "all", label: "All Submissions", icon: Users },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === t.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === "log" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm animate-in fade-in duration-300 space-y-6">
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} /> <span className="text-xs font-black uppercase tracking-widest">Attendance logged successfully.</span>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600">
              <AlertCircle size={16} /> <span className="text-xs font-black uppercase tracking-widest">{error}</span>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Session Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly PR All-Hands" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Session Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]">
                {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date & Time *</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Start Time</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">End Time</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
            </div>
            {form.startTime && form.endTime && (
              <div className="md:col-span-2 flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl">
                <Clock size={14} className="text-[var(--gold)]" />
                <span className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">Duration: {calcDuration(form.startTime, form.endTime).toFixed(2)} hours</span>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="What was covered, any action items..." className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Log Attendance
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">My Attendance History</h3>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
          : history.length === 0 ? <div className="py-16 text-center text-xs font-bold text-[var(--text-muted)] uppercase">No entries yet — log your first attendance above.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {history.map((h: any) => (
                    <tr key={h.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{new Date(h.markedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>
                      <td className="px-6 py-4 font-bold text-[var(--text-muted)] uppercase text-[10px]">{h.session?.subject ?? "—"}</td>
                      <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white">{h.duration ? `${(h.duration / 60).toFixed(2)}h` : "—"}</td>
                      <td className="px-6 py-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full">Present</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "all" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">All Submissions (Last 50)</h3>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
          : allSubs.length === 0 ? <div className="py-16 text-center text-xs font-bold text-[var(--text-muted)] uppercase">No submissions yet.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {allSubs.map((s: any) => (
                    <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{s.student?.name ?? "—"}</td>
                      <td className="px-6 py-4 font-bold text-[var(--text-muted)] uppercase text-[10px]">{s.session?.subject ?? "—"}</td>
                      <td className="px-6 py-4 font-bold text-[var(--text-muted)] text-[10px]">{new Date(s.markedAt).toLocaleDateString("en-GB")}</td>
                      <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white">{s.duration ? `${(s.duration/60).toFixed(1)}h` : "—"}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${s.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

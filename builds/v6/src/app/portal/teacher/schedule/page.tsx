"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getTeacherScheduleData, submitScheduleChangeRequest } from "@/lib/actions/schedules";
import { Calendar, BookOpen, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, Plus, FileText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-sky-100 text-sky-700",
  missed: "bg-red-100 text-red-700",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function TeacherSchedulePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState<"sessions" | "changes" | "content">("sessions");
  const [data, setData] = useState<{ sessions: any[]; changeRequests: any[]; contentItems: any[] }>({ sessions: [], changeRequests: [], contentItems: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ requestType: "RESCHEDULE", recurrenceType: "ONE_OFF", proposedStartTime: "", proposedEndTime: "", proposedDayOfWeek: "", proposedDuration: "", reason: "", scheduleId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    if (!user?.email) return;
    setLoading(true);
    const d = await getTeacherScheduleData(user.email);
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduleId) return;
    setSubmitting(true);
    try {
      await submitScheduleChangeRequest({
        scheduleId: form.scheduleId,
        requestType: form.requestType,
        recurrenceType: form.recurrenceType,
        proposedStartTime: form.proposedStartTime ? new Date(form.proposedStartTime) : undefined,
        proposedEndTime: form.proposedEndTime ? new Date(form.proposedEndTime) : undefined,
        proposedDayOfWeek: form.proposedDayOfWeek || undefined,
        proposedDuration: form.proposedDuration ? parseFloat(form.proposedDuration) : undefined,
        reason: form.reason || undefined,
      });
      setSuccess(true);
      setShowForm(false);
      await load();
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { id: "sessions", label: "Sessions", icon: Calendar, count: data.sessions.length },
    { id: "changes", label: "Change Requests", icon: RefreshCw, count: data.changeRequests.length },
    { id: "content", label: "Content Bank", icon: BookOpen, count: data.contentItems.length },
  ] as const;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--bg-secondary)] dark:bg-white/5" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Teaching</p>
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Schedule</h1>
        </div>
        {tab === "changes" && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-white font-bold rounded-xl text-sm">
            <Plus size={14} /> Request Change
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 rounded-2xl">
          <CheckCircle2 size={16} /> Change request submitted.
        </div>
      )}

      {/* Change request form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
          <h3 className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">New Change Request</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Type</label>
              <select value={form.requestType} onChange={e => setForm(f => ({...f, requestType: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none">
                {["RESCHEDULE","ADD","REMOVE","PAUSE"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Recurrence</label>
              <select value={form.recurrenceType} onChange={e => setForm(f => ({...f, recurrenceType: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none">
                {["ONE_OFF","WEEKLY","BIWEEKLY","MONTHLY"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Proposed Start</label>
              <input type="datetime-local" value={form.proposedStartTime} onChange={e => setForm(f => ({...f, proposedStartTime: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Proposed End</label>
              <input type="datetime-local" value={form.proposedEndTime} onChange={e => setForm(f => ({...f, proposedEndTime: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Duration (hrs)</label>
              <input type="number" step="0.5" value={form.proposedDuration} onChange={e => setForm(f => ({...f, proposedDuration: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Reason</label>
              <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-5 py-2 bg-[var(--gold)] text-white font-bold rounded-xl text-sm disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-[var(--border-subtle)] font-bold rounded-xl text-sm dark:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              tab === t.id ? "bg-[var(--gold)] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}>
            <t.icon size={12} /> {t.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === t.id ? "bg-white/20" : "bg-[var(--border-subtle)]"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.sessions.length === 0 && <p className="p-6 text-sm text-[var(--text-muted)]">No sessions yet.</p>}
            {data.sessions.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--navy)] dark:text-white">{s.subject ?? "Session"}</span>
                    <Badge status={s.status} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {s.student?.name ?? "—"} · {new Date(s.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    {" "}{new Date(s.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Clock size={12} />
                  {s.durationHours ? `${s.durationHours}h` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change requests tab */}
      {tab === "changes" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.changeRequests.length === 0 && <p className="p-6 text-sm text-[var(--text-muted)]">No change requests yet.</p>}
            {data.changeRequests.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--navy)] dark:text-white">{r.requestType}</span>
                    <Badge status={r.status} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {r.recurrenceType}
                    {r.proposedStartTime && ` · Proposed: ${new Date(r.proposedStartTime).toLocaleDateString("en-GB")}`}
                    {r.rejectionReason && ` · Rejected: ${r.rejectionReason}`}
                  </p>
                </div>
                {r.resolvedAt && (
                  <span className="text-xs text-[var(--text-muted)]">{new Date(r.resolvedAt).toLocaleDateString("en-GB")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content bank tab */}
      {tab === "content" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.contentItems.length === 0 && (
            <p className="col-span-2 text-sm text-[var(--text-muted)] p-6 bg-white dark:bg-white/5 rounded-2xl border border-[var(--border-subtle)]">No content items available.</p>
          )}
          {data.contentItems.map(c => (
            <a key={c.id} href={c.url} target="_blank" rel="noreferrer"
              className="flex items-start gap-3 p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--gold)] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] dark:bg-white/10 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-[var(--gold)]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-[var(--navy)] dark:text-white group-hover:text-[var(--gold)] transition-colors truncate">{c.name}</p>
                {c.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{c.description}</p>}
                {c.dateAdded && <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(c.dateAdded).toLocaleDateString("en-GB")}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

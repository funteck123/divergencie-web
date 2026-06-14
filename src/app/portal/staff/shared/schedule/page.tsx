"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getStaffScheduleData, createStaffScheduleChangeRequest } from "@/lib/actions/schedules";
import { Calendar, Clock, Plus, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PAUSED: "bg-slate-100 text-slate-600",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TABS = ["Occurrences", "Change Requests"];

export default function StaffSchedulePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState(0);
  const [data, setData] = useState<any>({ occurrences: [], changeRequests: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestType: "RESCHEDULE",
    recurrenceType: "WEEKLY",
    proposedDayOfWeek: "",
    proposedStartTime: "",
    proposedEndTime: "",
    proposedDuration: "",
    reason: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    getStaffScheduleData(user.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStaffScheduleChangeRequest({
        staffId: user.id,
        requestType: form.requestType,
        recurrenceType: form.recurrenceType,
        proposedDayOfWeek: form.proposedDayOfWeek || undefined,
        proposedStartTime: form.proposedStartTime || undefined,
        proposedEndTime: form.proposedEndTime || undefined,
        proposedDuration: form.proposedDuration ? Number(form.proposedDuration) : undefined,
        reason: form.reason || undefined,
      });
      const refreshed = await getStaffScheduleData(user.id);
      setData(refreshed);
      setShowForm(false);
      setForm({ requestType: "RESCHEDULE", recurrenceType: "WEEKLY", proposedDayOfWeek: "", proposedStartTime: "", proposedEndTime: "", proposedDuration: "", reason: "" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Staff</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">My Schedule</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Your working schedule and change requests.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              tab === i ? "border-b-2 border-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          {data.occurrences.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
              <Calendar size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
              <p className="text-[var(--text-muted)] text-sm">No schedule occurrences yet.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Contact HR or management to set up your schedule.</p>
            </div>
          ) : data.occurrences.map((occ: any) => (
            <div key={occ.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[occ.status] ?? "bg-gray-100 text-gray-600"}`}>{occ.status}</span>
                      <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{occ.recurrenceType}</span>
                      {occ.dayOfWeek && <span className="text-xs text-[var(--text-muted)]">{occ.dayOfWeek}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-[var(--text-muted)]">
                        <Clock size={12} /> {occ.startTime ? new Date(occ.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        {" – "}{occ.endTime ? new Date(occ.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs">{occ.durationHours}h</span>
                    </div>
                  </div>
                  {occ.history?.length > 0 && (
                    <button onClick={() => setExpanded(expanded === occ.id ? null : occ.id)}
                      className="text-xs text-[var(--gold)] font-bold flex items-center gap-1 shrink-0">
                      History {expanded === occ.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
                {expanded === occ.id && (
                  <div className="mt-3 border-l-2 border-[var(--gold)]/30 pl-3 space-y-1.5">
                    {occ.history.map((h: any) => (
                      <div key={h.id} className="text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--navy)] dark:text-white">{h.fromStatus} → {h.toStatus}</span>
                        <span className="ml-2">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                        {h.reason && <span className="ml-2 italic">"{h.reason}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">{data.changeRequests.length} request{data.changeRequests.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity">
              <Plus size={14} /> New Request
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Schedule Change Request</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Request Type</label>
                  <select value={form.requestType} onChange={e => setForm(f => ({ ...f, requestType: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none">
                    {["RESCHEDULE", "ADD", "REMOVE", "PAUSE"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Recurrence</label>
                  <select value={form.recurrenceType} onChange={e => setForm(f => ({ ...f, recurrenceType: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none">
                    {["WEEKLY", "BIWEEKLY", "MONTHLY", "ONE_OFF"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Day of Week</label>
                  <select value={form.proposedDayOfWeek} onChange={e => setForm(f => ({ ...f, proposedDayOfWeek: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none">
                    <option value="">—</option>
                    {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Duration (hrs)</label>
                  <input type="number" min="0.5" max="8" step="0.5" value={form.proposedDuration}
                    onChange={e => setForm(f => ({ ...f, proposedDuration: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Proposed Start</label>
                  <input type="datetime-local" value={form.proposedStartTime}
                    onChange={e => setForm(f => ({ ...f, proposedStartTime: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Proposed End</label>
                  <input type="datetime-local" value={form.proposedEndTime}
                    onChange={e => setForm(f => ({ ...f, proposedEndTime: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg focus:border-[var(--gold)] outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 size={12} className="animate-spin" />} Submit
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {data.changeRequests.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
                <p className="text-[var(--text-muted)] text-sm">No change requests submitted.</p>
              </div>
            ) : data.changeRequests.map((req: any) => (
              <div key={req.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-600"}`}>{req.status}</span>
                      <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{req.requestType}</span>
                      <span className="text-xs text-[var(--text-muted)]">{req.recurrenceType}</span>
                    </div>
                    {req.proposedDayOfWeek && <p className="text-xs text-[var(--text-muted)]">Day: {req.proposedDayOfWeek}</p>}
                    {req.proposedDuration && <p className="text-xs text-[var(--text-muted)]">Duration: {req.proposedDuration}h</p>}
                    {req.rejectionReason && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-600 dark:text-red-400 italic">{req.rejectionReason}</p>
                      </div>
                    )}
                    {req.resolvedAt && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Resolved {new Date(req.resolvedAt).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

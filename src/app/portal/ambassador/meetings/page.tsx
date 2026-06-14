"use client";

import { useState, useEffect } from "react";
import { Video, Calendar, ClipboardCheck, ChevronDown, ChevronUp, Plus, Loader2, Star, ExternalLink } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  getAmbassadorMeetings,
  getAmbassadorScheduleData,
  getAmbassadorTests,
  createAmbassadorScheduleChangeRequest,
} from "@/lib/actions/ambassador";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-amber-100 text-amber-700",
  no_show: "bg-red-100 text-red-600",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TABS = ["Sessions", "Schedule", "Tests & Timeline"];

export default function AmbassadorMeetingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState(0);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [testServices, setTestServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCRForm, setShowCRForm] = useState<string | null>(null);
  const [crForm, setCRForm] = useState({ requestType: "RESCHEDULE", recurrenceType: "WEEKLY", proposedDayOfWeek: "Monday", proposedStartTime: "", proposedEndTime: "" });
  const [crSaving, setCRSaving] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [m, s, t] = await Promise.all([
      getAmbassadorMeetings(user.id),
      getAmbassadorScheduleData(user.id),
      getAmbassadorTests(user.id),
    ]);
    setMeetings(m ?? []);
    setSchedules(s ?? []);
    setTestServices(t ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleChangeRequest = async (scheduleId: string) => {
    setCRSaving(true);
    await createAmbassadorScheduleChangeRequest({ scheduleId, ...crForm });
    setShowCRForm(null);
    await load();
    setCRSaving(false);
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-4xl">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Sessions & Schedule</h1>
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

      {/* Sessions tab */}
      {tab === 0 && (
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
              <Video size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-muted)] text-sm">No sessions found.</p>
            </div>
          ) : meetings.map((att: any) => {
            const mtg = att.meeting;
            if (!mtg) return null;
            const isOpen = expanded === att.id;
            return (
              <div key={att.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[mtg.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {mtg.status}
                      </span>
                      {mtg.isTrial && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700">Trial</span>}
                      <span className="text-xs text-[var(--text-muted)]">{mtg.sessionType?.name}</span>
                    </div>
                    <p className="font-black text-sm text-[var(--navy)] dark:text-white">{mtg.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(mtg.startTime).toLocaleDateString("en-GB")} · {new Date(mtg.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — {new Date(mtg.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      <span className="ml-2">{mtg.durationHours}h</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mtg.zoomLink && (
                      <a href={mtg.zoomLink} target="_blank" rel="noreferrer"
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : att.id)}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)]">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--border-subtle)] px-5 py-4 space-y-4">
                    {/* Attendance details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Attendance Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[att.status] ?? "bg-slate-100 text-slate-600"}`}>{att.status}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Hours</p>
                        <p className="font-bold text-[var(--navy)] dark:text-white">Logged: {att.ambassadorLoggedHours}h {!att.hoursMatch && <span className="text-red-500 text-[10px]">(mismatch)</span>}</p>
                      </div>
                    </div>
                    {att.feedbackStars && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Your Feedback</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className={i < att.feedbackStars ? "text-[var(--gold)] fill-[var(--gold)]" : "text-[var(--border-subtle)]"} />
                          ))}
                        </div>
                        {att.feedbackText && <p className="text-xs text-[var(--text-muted)] mt-1 italic">"{att.feedbackText}"</p>}
                      </div>
                    )}
                    {mtg.recordingUrl && (
                      <a href={mtg.recordingUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--gold)] font-bold hover:underline">
                        <Video size={12} /> View Recording
                      </a>
                    )}
                    {mtg.agenda && <p className="text-xs text-[var(--text-muted)] italic">{mtg.agenda}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule tab */}
      {tab === 1 && (
        <div className="space-y-6">
          {schedules.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
              <Calendar size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-muted)] text-sm">No schedule configured.</p>
            </div>
          ) : schedules.map((sched: any) => (
            <div key={sched.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{sched.ambassadorService?.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{sched.ambassadorService?.serviceType}</p>
                </div>
                <button onClick={() => setShowCRForm(showCRForm === sched.id ? null : sched.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-subtle)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors">
                  <Plus size={11} /> Request Change
                </button>
              </div>

              {showCRForm === sched.id && (
                <div className="border-b border-[var(--border-subtle)] px-5 py-4 bg-[var(--bg-secondary)] dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Schedule Change Request</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Request Type</label>
                      <select value={crForm.requestType} onChange={e => setCRForm(f => ({ ...f, requestType: e.target.value }))}
                        className="w-full p-2 text-xs border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                        {["RESCHEDULE","ADD","REMOVE","PAUSE"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Day of Week</label>
                      <select value={crForm.proposedDayOfWeek} onChange={e => setCRForm(f => ({ ...f, proposedDayOfWeek: e.target.value }))}
                        className="w-full p-2 text-xs border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                        {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Proposed Start</label>
                      <input type="datetime-local" value={crForm.proposedStartTime} onChange={e => setCRForm(f => ({ ...f, proposedStartTime: e.target.value }))}
                        className="w-full p-2 text-xs border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Proposed End</label>
                      <input type="datetime-local" value={crForm.proposedEndTime} onChange={e => setCRForm(f => ({ ...f, proposedEndTime: e.target.value }))}
                        className="w-full p-2 text-xs border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
                    </div>
                  </div>
                  <button onClick={() => handleChangeRequest(sched.id)} disabled={crSaving}
                    className="px-4 py-2 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                    {crSaving && <Loader2 size={11} className="animate-spin" />} Submit Request
                  </button>
                </div>
              )}

              {/* Occurrences */}
              <div className="divide-y divide-[var(--border-subtle)]">
                {sched.occurrences?.map((occ: any) => (
                  <div key={occ.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{occ.recurrenceType}</span>
                      {occ.dayOfWeek && <span className="ml-2 text-xs text-[var(--text-muted)]">{occ.dayOfWeek}</span>}
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        {new Date(occ.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — {new Date(occ.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {occ.durationHours}h
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[occ.status] ?? "bg-slate-100 text-slate-600"}`}>{occ.status}</span>
                  </div>
                ))}
              </div>

              {/* Change requests */}
              {sched.changeRequests?.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Change Requests ({sched.changeRequests.length})</p>
                  <div className="space-y-2">
                    {sched.changeRequests.map((cr: any) => (
                      <div key={cr.id} className="flex items-center justify-between text-xs bg-[var(--bg-secondary)] dark:bg-white/5 rounded-lg px-3 py-2">
                        <span className="font-bold text-[var(--navy)] dark:text-white">{cr.requestType}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[cr.status] ?? "bg-slate-100 text-slate-600"}`}>{cr.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tests & Timeline tab */}
      {tab === 2 && (
        <div className="space-y-6">
          {testServices.length === 0 || testServices.every(s => !s.programmeList?.testLists?.length) ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
              <ClipboardCheck size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-muted)] text-sm">No tests found.</p>
            </div>
          ) : testServices.map((svc: any) => {
            const testLists = svc.programmeList?.testLists ?? [];
            if (!testLists.length) return null;
            return (
              <div key={svc.id}>
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">{svc.title}</h3>
                {testLists.map((tl: any) => (
                  <div key={tl.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden mb-3">
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <p className="font-black text-xs uppercase tracking-widest text-[var(--navy)] dark:text-white">{tl.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[tl.status] ?? "bg-slate-100 text-slate-600"}`}>{tl.status}</span>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {tl.testItems?.map((item: any) => {
                        const result = item.results?.[0];
                        return (
                          <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-[var(--navy)] dark:text-white">{item.testType}</p>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {new Date(item.scheduledDate).toLocaleDateString("en-GB")} · {item.totalMarks} marks
                              </p>
                            </div>
                            <div className="text-right">
                              {result ? (
                                <>
                                  <p className="text-sm font-black text-[var(--gold)]">{result.marksScored}/{result.marksAvailable}</p>
                                  <p className="text-[10px] text-[var(--text-muted)]">{((result.marksScored / result.marksAvailable) * 100).toFixed(1)}%</p>
                                </>
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Pending</span>
                              )}
                              {item.paperLink && (
                                <a href={item.paperLink} target="_blank" rel="noreferrer"
                                  className="block text-[10px] text-[var(--gold)] hover:underline mt-0.5">Paper →</a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

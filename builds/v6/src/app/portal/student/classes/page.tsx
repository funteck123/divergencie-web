"use client";

import { useState, useEffect } from "react";
import { getStudentSessions } from "@/lib/actions/progress";
import { 
  getStudentSchedules, 
  submitScheduleChangeRequest, 
  getStudentAttendanceHistory, 
  submitSessionFeedback 
} from "@/lib/actions/schedules";
import { useSession } from "@/lib/auth-client";
import { 
  Calendar, 
  Video, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  BookOpen, 
  Monitor, 
  X, 
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  MoreVertical,
  Star,
  Loader2
} from "lucide-react";

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
const SUBJECT_COLORS = ['#3b82f6', '#e8a832', '#ef4444', '#a855f7', '#10b981'];

export default function StudentClassesPage() {
  const { data: session } = useSession();
  const [tz, setTz] = useState("UTC+0");
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Dynamic Data States
  const [sessions, setSessions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback Dialog State
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [feedbackStars, setFeedbackStars] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Reschedule Form State
  const [rescheduleScheduleId, setRescheduleScheduleId] = useState("");
  const [rescheduleDateStr, setRescheduleDateStr] = useState("");
  const [rescheduleTimeStr, setRescheduleTimeStr] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset() / 60;
      setTz(`${zone.split('/').pop()?.replace(/_/g,' ')} (UTC${offset >= 0 ? '+' : ''}${offset})`);
    } catch(e) {}
  }, []);

  const loadData = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const [sessData, attData, schedData] = await Promise.all([
        getStudentSessions(session.user.email),
        getStudentAttendanceHistory(session.user.email),
        getStudentSchedules(session.user.email)
      ]);
      setSessions(sessData);
      setAttendance(attData);
      setSchedules(schedData);
      
      if (schedData.length > 0) {
        setRescheduleScheduleId(schedData[0].id);
      }
    } catch (err) {
      console.error("Failed to load classes and schedules data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadData();
    }
  }, [session]);

  // Navigate week
  const handlePrevWeek = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 7);
    setViewDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 7);
    setViewDate(d);
  };

  const handleGoToday = () => {
    setViewDate(new Date());
  };

  // Get start of week (Monday)
  const getWeekStart = (d: Date) => {
    const weekStart = new Date(d);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weekStart = getWeekStart(viewDate);
  
  const getWeekRangeLabel = () => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(start.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' };
    return `${start.toLocaleDateString(undefined, options)} – ${end.toLocaleDateString(undefined, options)} ${end.toLocaleDateString(undefined, yearOptions)}`;
  };

  const getWeekDaysDates = () => {
    return WEEK_DAYS.map((day, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return {
        name: day,
        dateNum: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString(),
        fullDate: d
      };
    });
  };

  const weekDaysDates = getWeekDaysDates();

  // Filter and map sessions for calendar grid
  const calendarSessions = sessions.filter((s: any) => {
    const sTime = new Date(s.startTime);
    const wStart = new Date(weekStart);
    const wEnd = new Date(weekStart);
    wEnd.setDate(wStart.getDate() + 7);
    return sTime >= wStart && sTime < wEnd && s.status !== "CANCELLED";
  }).map((s: any, idx: number) => {
    const d = new Date(s.startTime);
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    const hour = d.getHours() + d.getMinutes() / 60;
    const endD = new Date(s.endTime);
    const duration = (endD.getTime() - d.getTime()) / 3600000;
    return {
      day: dayIdx,
      hour,
      duration,
      subject: s.subject,
      instructor: s.teacher?.name ?? '—',
      zoomLink: s.zoomLink,
      color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      raw: s
    };
  });

  // Today's sessions (sessions happening on today's calendar date)
  const todaySessions = sessions.filter((s: any) => {
    const sTime = new Date(s.startTime);
    return sTime.toDateString() === new Date().toDateString() && s.status !== "CANCELLED";
  });

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendance) return;
    setSubmittingFeedback(true);
    try {
      await submitSessionFeedback(selectedAttendance.id, feedbackStars, feedbackText);
      setSelectedAttendance(null);
      setFeedbackText("");
      setFeedbackStars(5);
      await loadData();
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      alert("Error submitting feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleScheduleId || !rescheduleDateStr || !rescheduleTimeStr) {
      alert("Please fill in all fields");
      return;
    }
    setSubmittingReschedule(true);
    try {
      const proposedStart = new Date(`${rescheduleDateStr}T${rescheduleTimeStr}:00`);
      const proposedEnd = new Date(proposedStart.getTime() + 60 * 60 * 1000); // default 1 hour duration
      
      await submitScheduleChangeRequest({
        scheduleId: rescheduleScheduleId,
        requestType: "RESCHEDULE",
        recurrenceType: "ONE_OFF",
        proposedStartTime: proposedStart,
        proposedEndTime: proposedEnd,
        proposedDuration: 1.0,
        reason: rescheduleReason
      });

      setIsRescheduleOpen(false);
      setRescheduleDateStr("");
      setRescheduleTimeStr("");
      setRescheduleReason("");
      alert("Reschedule request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit reschedule request:", err);
      alert("Error submitting request. Please try again.");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Class Schedule</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage your weekly sessions, join live classrooms, and rate sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled={schedules.length === 0}
            onClick={() => setIsRescheduleOpen(true)} 
            className="px-5 py-2.5 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white hover:border-[var(--gold)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Clock size={14} className="text-[var(--gold)]" /> Request Reschedule
          </button>
        </div>
      </div>

      {/* Timezone & Week Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-lg text-[var(--gold)]">
            <Globe size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Timezone</p>
            <p className="text-xs font-bold text-[var(--navy)] dark:text-white uppercase">{tz}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full text-[var(--text-muted)] transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">
              {getWeekRangeLabel()}
            </span>
            <button onClick={handleNextWeek} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full text-[var(--text-muted)] transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={handleGoToday}
            className="text-[10px] font-black text-[var(--gold)] uppercase border border-[var(--gold)] px-4 py-1.5 rounded-full hover:bg-[var(--gold)] hover:text-black transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-[var(--bg-secondary)] dark:bg-white/5 border-b border-[var(--border-subtle)] dark:border-white/10">
              <div className="p-4 border-r border-[var(--border-subtle)] dark:border-white/10"></div>
              {weekDaysDates.map((day) => (
                <div key={day.name} className={`p-4 text-center border-r border-[var(--border-subtle)] dark:border-white/10 last:border-0 ${day.isToday ? 'bg-amber-500/10 dark:bg-amber-500/20 text-[var(--navy)] dark:text-white' : ''}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-amber-600 font-bold' : 'text-[var(--text-muted)]'}`}>{day.name}</p>
                  <p className="text-sm font-black mt-0.5">{day.dateNum}</p>
                </div>
              ))}
            </div>
            
            <div className="relative overflow-y-auto max-h-[600px] grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time Column */}
              <div className="flex flex-col">
                {HOURS.map(h => (
                  <div key={h} className="h-20 p-2 text-[9px] font-black text-[var(--text-muted)] text-right border-r border-b border-[var(--border-subtle)] dark:border-white/10 uppercase">
                    {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                  </div>
                ))}
              </div>
              
              {/* Day Columns */}
              {WEEK_DAYS.map((_, dayIdx) => (
                <div key={dayIdx} className="flex flex-col border-r border-[var(--border-subtle)] dark:border-white/10 last:border-0 relative">
                  {HOURS.map(h => (
                    <div key={h} className="h-20 border-b border-[var(--border-subtle)] dark:border-white/10"></div>
                  ))}
                  
                  {/* Class Pills */}
                  {calendarSessions.filter(c => c.day === dayIdx).map((c, i) => {
                    const startHour = c.hour;
                    if (startHour < 8 || startHour > 23) return null;
                    return (
                      <div 
                        key={i} 
                        className={`absolute left-1 right-1 rounded-xl p-2.5 border-l-4 shadow-sm group cursor-pointer transition-all hover:scale-[1.02] hover:z-10 bg-white dark:bg-[#151515] border border-[var(--border-subtle)] dark:border-white/10 hover:border-[var(--gold)]`}
                        style={{ 
                          top: `${(startHour - 8) * 80 + 4}px`, 
                          height: `${c.duration * 80 - 8}px`,
                          borderLeftColor: c.color
                        }}
                      >
                        <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">
                          {c.raw.startTime ? new Date(c.raw.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                        </p>
                        <p className="text-[10px] font-black text-[var(--navy)] dark:text-white leading-tight uppercase truncate">{c.subject}</p>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mt-0.5 truncate">{c.instructor}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Side Panel: Today's Detail & Attendance */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl p-8 shadow-sm">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} className="text-[var(--gold)]" /> Sessions Today
              </h3>
              
              <div className="space-y-4">
                {todaySessions.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase py-4">No sessions scheduled for today</p>
                ) : (
                  todaySessions.map((c, i) => {
                    const sTime = new Date(c.startTime);
                    const eTime = new Date(c.endTime);
                    const timeRange = `${sTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} – ${eTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                    return (
                      <div key={i} className="p-6 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl group hover:border-[var(--gold)] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1 h-8 bg-[var(--gold)] rounded-full"></div>
                          <div>
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{timeRange}</p>
                            <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.subject}</p>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                            <User size={12} className="text-[var(--gold)]" /> {c.teacher?.name ?? '—'}
                          </div>
                          {c.topic && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                              <BookOpen size={12} className="text-[var(--gold)]" /> {c.topic}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {c.zoomLink ? (
                            <a 
                              href={c.zoomLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-3 bg-[#2D8CFF] text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-center"
                            >
                              <Video size={12} /> Join Zoom
                            </a>
                          ) : (
                            <span className="py-3 bg-gray-100 dark:bg-white/5 text-[var(--text-muted)] text-[8px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                              No Zoom Link
                            </span>
                          )}
                          {c.wbLink ? (
                            <a 
                              href={c.wbLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:border-[var(--gold)] transition-all text-center"
                            >
                              <Monitor size={12} /> Whiteboard
                            </a>
                          ) : (
                            <span className="py-3 bg-white dark:bg-white/5 border border-dashed border-[var(--border-subtle)] dark:border-white/10 text-[var(--text-muted)] text-[8px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                              No Board
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Attendance Tracker */}
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl p-8 shadow-sm">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <History size={16} className="text-[var(--gold)]" /> Recent Attendance
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {attendance.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase py-2">No attendance records logged yet</p>
                ) : (
                  attendance.map((item, i) => {
                    const s = item.session;
                    const dateObj = s?.startTime ? new Date(s.startTime) : null;
                    const formattedDate = dateObj ? dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
                    
                    let statusColor = "text-emerald-500 bg-emerald-500/10";
                    if (item.status === "ABSENT_NO_SHOW") statusColor = "text-red-500 bg-red-500/10";
                    if (item.status === "ABSENT_NOTIFIED") statusColor = "text-amber-500 bg-amber-500/10";
                    
                    const isPresent = item.status === "PRESENT";
                    const hasGivenFeedback = item.feedbackStars !== null;

                    return (
                      <div key={i} className="p-3 bg-[var(--bg-secondary)]/50 dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl hover:border-[var(--gold)] transition-all flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-[var(--navy)] dark:text-white uppercase">{formattedDate}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{s?.subject || 'Session'}</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${statusColor}`}>
                            {item.status}
                          </span>
                        </div>
                        
                        {isPresent && (
                          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] dark:border-white/10 pt-2 mt-1">
                            {hasGivenFeedback ? (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, starIdx) => (
                                  <Star 
                                    key={starIdx} 
                                    size={10} 
                                    className={starIdx < item.feedbackStars ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-600"} 
                                  />
                                ))}
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setSelectedAttendance(item); setFeedbackStars(5); setFeedbackText(""); }}
                                className="text-[8px] font-black uppercase tracking-widest text-[var(--gold)] border border-[var(--gold)]/30 hover:border-[var(--gold)] px-2 py-1 rounded-lg transition-all"
                              >
                                Rate Session
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Request Reschedule</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Submit request for missed or future classes</p>
              </div>
              <button onClick={() => setIsRescheduleOpen(false)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleRescheduleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Course Schedule</label>
                <select 
                  value={rescheduleScheduleId}
                  onChange={e => setRescheduleScheduleId(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)]"
                >
                  {schedules.map(sched => (
                    <option key={sched.id} value={sched.id}>
                      {sched.service?.name || "Active Schedule"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Preferred Date</label>
                  <input 
                    type="date" 
                    required
                    value={rescheduleDateStr}
                    onChange={e => setRescheduleDateStr(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Preferred Time</label>
                  <input 
                    type="time" 
                    required
                    value={rescheduleTimeStr}
                    onChange={e => setRescheduleTimeStr(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Reason</label>
                <textarea 
                  rows={3} 
                  required
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="Briefly explain the need for rescheduling..." 
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingReschedule}
                className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingReschedule ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
                Send Request
              </button>
            </form>

            <div className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border-t border-[var(--border-subtle)] dark:border-white/10 text-center">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                Requests are processed within <span className="text-[var(--gold)]">4 hours</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Feedback Star Rating Modal */}
      {selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Rate Session</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Provide feedback for {selectedAttendance.session?.subject || 'Class'}</p>
              </div>
              <button onClick={() => setSelectedAttendance(null)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-6">
              <div className="space-y-3 text-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">How would you rate this class?</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {Array.from({ length: 5 }).map((_, starIdx) => {
                    const rating = starIdx + 1;
                    return (
                      <button
                        type="button"
                        key={starIdx}
                        onClick={() => setFeedbackStars(rating)}
                        className="p-1 transition-all hover:scale-110"
                      >
                        <Star 
                          size={28} 
                          className={rating <= feedbackStars ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-700"} 
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Your Comments (Optional)</label>
                <textarea 
                  rows={3} 
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Share details about what went well, or areas of improvement..." 
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingFeedback}
                className="w-full py-5 bg-[var(--navy)] hover:bg-[var(--navy)]/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submittingFeedback && <Loader2 size={14} className="animate-spin" />}
                Submit Rating
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

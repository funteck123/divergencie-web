"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  LayoutDashboard, 
  Video, 
  ClipboardCheck, 
  Banknote, 
  Ticket, 
  MessageSquare, 
  CheckSquare, 
  ExternalLink, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  Monitor,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Search,
  Megaphone
} from "lucide-react";
import { getPendingAttendance, submitAttendance } from "@/lib/actions/attendance";
import { getTeacherDashboardData } from "@/lib/actions/stats";
import { useSession } from "@/lib/auth-client";

function TeacherDashboardInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [data, setData] = useState<{ tickets: any[], announcements: any[], lastClaim?: any, todaySessions?: any[] }>({ tickets: [], announcements: [], todaySessions: [] });
  const [checklist, setChecklist] = useState({
    rec: false,
    breakout: false,
    camera: false,
    whiteboard: false,
    students: false
  });
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const checkCount = Object.values(checklist).filter(v => v).length;
  const checkPct = (checkCount / 5) * 100;

  useEffect(() => {
    if (session?.user?.email) {
      Promise.all([
        getPendingAttendance(session.user.email),
        getTeacherDashboardData(session.user.email),
      ]).then(([pending, dashData]) => {
        setPendingSessions(pending);
        setData(dashData);
      });
    }
  }, [session]);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredTickets = data.tickets.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
  const filteredAnnouncements = data.announcements.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header with search parity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Teacher Portal</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Financial Status Strip */}
      <div className="bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] p-6 rounded-3xl flex flex-wrap items-center gap-8 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Last Claim Status</p>
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-black text-[var(--navy)] dark:text-white uppercase">{data?.lastClaim?.month ?? "—"}</p>
            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${data?.lastClaim?.status === "approved" ? "bg-emerald-100 text-emerald-700" : data?.lastClaim?.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"}`}>{data?.lastClaim?.status ?? "none"}</span>
          </div>
        </div>
        <div className="w-px h-10 bg-[var(--border-subtle)] hidden md:block"></div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Amount</p>
          <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase">{data?.lastClaim ? `£ ${data.lastClaim.amount.toFixed(2)}` : "—"}</p>
        </div>
        <div className="w-px h-10 bg-[var(--border-subtle)] hidden md:block"></div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Open Tickets</p>
          <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase">{data.tickets.length} Assigned</p>
        </div>
        <button className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
          Submit May Claim <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Classes", val: (data.todaySessions?.length ?? 0).toString(), sub: "Classes scheduled for today", icon: Video, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-500/20" },
          { label: "Pending Attendance", val: pendingSessions.length, sub: "Unsubmitted sessions", icon: ClipboardCheck, color: "text-red-500", bg: "bg-red-100 dark:bg-red-500/20" },
          { label: "Open Tickets", val: data.tickets.length, sub: "Assigned to me", icon: Ticket, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20" },
          { label: "Performance", val: "A*", sub: "Quality Score: 98%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${s.bg} ${s.color} flex-shrink-0`}>
                {/* @ts-ignore */}
                <s.icon size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
                <p className="text-4xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase mt-1">{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column — Classes + Tickets */}
        <div className="space-y-6">
          {/* Today's Classes */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Video size={16} className="text-[var(--gold)]" /> Today's Classes
            </h3>
            <div className="space-y-4">
              {!data.todaySessions || data.todaySessions.length === 0 ? (
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase text-center py-8 italic opacity-50">No classes scheduled for today.</p>
              ) : (
                data.todaySessions.map((c: any) => {
                  const start = new Date(c.startTime);
                  const end = new Date(c.endTime);
                  const now = new Date();
                  
                  let status = "Upcoming";
                  let color = "bg-blue-500";
                  if (now >= start && now <= end) {
                    status = "In Session";
                    color = "bg-[var(--gold)]";
                  } else if (now > end) {
                    status = "Completed";
                    color = "bg-emerald-500";
                  }
                  
                  const startStr = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  const endStr = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  const timeStr = `${startStr} – ${endStr}`;
                  const studentName = c.student?.name || "Student";
                  
                  return (
                    <div key={c.id} className="p-5 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-2xl group hover:border-[var(--gold)] transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-10 ${color} rounded-full`}></div>
                        <div>
                          <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.subject || "Academic Session"}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                            {studentName} · {timeStr} ({status})
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {c.zoomLink ? (
                          <a href={c.zoomLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#2D8CFF] text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:opacity-90">
                            Zoom
                          </a>
                        ) : (
                          <button disabled className="px-4 py-2 bg-[#2D8CFF]/40 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 cursor-not-allowed">
                            Zoom
                          </button>
                        )}
                        {c.wbLink ? (
                          <a href={c.wbLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white dark:bg-white/10 border border-[var(--border-subtle)] text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:border-[var(--gold)]">
                            Board
                          </a>
                        ) : (
                          <button disabled className="px-4 py-2 bg-white/20 dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 cursor-not-allowed">
                            Board
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Open Tickets */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Ticket size={16} className="text-[var(--gold)]" /> Assigned Tickets
            </h3>
            <div className="space-y-4">
              {filteredTickets.length > 0 ? filteredTickets.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl group hover:border-[var(--gold)] transition-all">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-[var(--text-muted)]">{t.id.slice(-8).toUpperCase()}</span>
                      <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">{t.title}</p>
                    </div>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{new Date(t.createdAt).toLocaleDateString()} · Priority: {t.priority}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${t.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.status}
                  </span>
                </div>
              )) : (
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase text-center py-8 italic opacity-50">No tickets found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Checklist + Pending Attendance only */}
        <div className="space-y-6">
          {/* Pre-Class Checklist */}
          <div className="bg-white dark:bg-white/5 border-l-4 border-[var(--gold)] border-y border-r border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckSquare size={16} className="text-[var(--gold)]" /> Pre-Class Checklist
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-8">Complete before each class session.</p>
            
            <div className="space-y-3">
              {[
                { key: 'rec', label: 'Recording is ON in Zoom' },
                { key: 'breakout', label: 'Breakout rooms created' },
                { key: 'camera', label: 'Camera and Mic tested' },
                { key: 'whiteboard', label: 'Whiteboard correctly titled' },
                { key: 'students', label: 'Students reminded of link' },
              ].map((item) => (
                <button 
                  key={item.key}
                  onClick={() => toggleCheck(item.key as keyof typeof checklist)}
                  className={`w-full p-4 flex items-center gap-4 border-2 rounded-2xl transition-all ${
                    checklist[item.key as keyof typeof checklist] 
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/30' 
                      : 'bg-[var(--bg-secondary)] dark:bg-white/5 border-[var(--border-subtle)] hover:border-[var(--gold)]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
                    checklist[item.key as keyof typeof checklist] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-subtle)]'
                  }`}>
                    {checklist[item.key as keyof typeof checklist] && <CheckCircle2 size={12} />}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-tight ${
                    checklist[item.key as keyof typeof checklist] ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-[var(--navy)] dark:text-white'
                  }`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-2">
              <div className="h-1.5 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--gold)] rounded-full transition-all duration-500" style={{ width: `${checkPct}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{checkCount} / 5 Done</span>
                {checkPct === 100 && <span className="text-[10px] font-black text-emerald-500 uppercase">Ready to Teach! ✅</span>}
              </div>
            </div>
          </div>

          {/* Pending Attendance */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-8 rounded-3xl">
            <h3 className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertCircle size={18} /> Pending Attendance
            </h3>
            <div className="space-y-4">
              {pendingSessions.length > 0 ? pendingSessions.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
                  <div>
                    <p className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase">{p.subject}</p>
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">{p.topic} · {new Date(p.startTime).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedSession(p); setShowAttendanceModal(true); }}
                    className="px-4 py-2 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
                  >
                    Submit
                  </button>
                </div>
              )) : (
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase text-center py-4 italic">No pending attendance found.</p>
              )}
            </div>

            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase mt-6 leading-relaxed">
              ⚠️ Unsubmitted sessions delay your monthly pay claim processing.
            </p>
          </div>
        </div>
      </div>

      {/* Full-width bottom row — Announcements + WhatsApp */}
      <div className="grid lg:grid-cols-3 gap-6">
          {/* Announcements */}
          <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Megaphone size={16} className="text-[var(--gold)]" /> Announcements
            </h3>
            <div className="space-y-6">
              {filteredAnnouncements.length > 0 ? filteredAnnouncements.map((a, i) => (
                <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-1 before:h-8 before:bg-[var(--gold)]/20 hover:before:bg-[var(--gold)] before:transition-all">
                  <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">{a.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest">
                    {a.priority === 'high' && <span className="text-[var(--gold)] mr-2">● IMPORTANT</span>}
                    {new Date(a.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
              )) : (
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase text-center py-8 italic opacity-50">No announcements.</p>
              )}
            </div>
          </div>

          {/* WhatsApp Support */}
          <div className="flex flex-col gap-4">
            <a href="https://wa.me/919650675507" target="_blank" className="flex-1 bg-[#25D366] text-white p-6 rounded-3xl flex items-center justify-between hover:opacity-95 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">Need Urgent Help?</p>
                  <p className="text-[11px] font-bold uppercase opacity-80">WhatsApp DivergenCIE Staff</p>
                </div>
              </div>
              <ArrowRight size={20} />
            </a>
          </div>
      </div>
      {/* Attendance Modal */}
      {showAttendanceModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#121212] border border-[var(--border-subtle)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)]">
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Submit Attendance</h2>
              <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mt-1">{selectedSession.subject} · {selectedSession.topic}</p>
            </div>
            
            <form action={async (formData) => {
              setLoading(true);
              try {
                await submitAttendance(formData);
                setShowAttendanceModal(false);
                getPendingAttendance(session?.user?.email!).then(setPendingSessions);
                alert("Attendance submitted successfully!");
              } catch (err: any) {
                alert(err.message || "Error submitting attendance");
              } finally {
                setLoading(false);
              }
            }} className="p-8 space-y-6">
              <input type="hidden" name="sessionId" value={selectedSession.id} />
              <input type="hidden" name="userId" value={session?.user?.email!} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Student Status</label>
                  <select name="status" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]">
                    <option value="present">Present</option>
                    <option value="absent">Absent / No-Show</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Duration (Mins)</label>
                  <input type="number" name="duration" defaultValue="60" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Whiteboard Link (Mandatory)</label>
                <input type="url" name="wbLink" required placeholder="https://whiteboard.microsoft.com/..." className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Session Notes</label>
                <textarea name="notes" rows={3} placeholder="What was covered? Any issues?" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAttendanceModal(false)} className="flex-1 py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-80 transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                  {loading ? "Submitting..." : "Confirm Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24 text-[var(--gold)] font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
      <TeacherDashboardInner />
    </Suspense>
  );
}

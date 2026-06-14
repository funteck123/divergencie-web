"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Video, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  Bell, 
  CheckSquare, 
  Megaphone, 
  Zap, 
  Globe, 
  ArrowRight, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap
} from "lucide-react";
import { getStudentProgressStats, getStudentAssignments, getStudentAnnouncements, getStudentSessions } from "@/lib/actions/progress";
import { getStudentProfileStatus } from "@/lib/actions/profile";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tz, setTz] = useState("UTC+0");
  const [stats, setStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset() / 60;
      setTz(`${zone.split('/').pop()?.replace(/_/g,' ')} (UTC${offset >= 0 ? '+' : ''}${offset})`);
    } catch(e) {}

    if (session?.user?.email) {
      // 1. Check profile status & finance approval
      getStudentProfileStatus(session.user.email).then((statusInfo) => {
        if (statusInfo) {
          if (!statusInfo.financeApproved || statusInfo.status !== "ACTIVE") {
            router.push("/portal/student/awaiting-approval");
            return;
          }
        }
        
        // 2. If approved, load dashboard data
        Promise.all([
          getStudentProgressStats(session.user.email),
          getStudentAssignments(session.user.email),
          getStudentAnnouncements(),
          getStudentSessions(session.user.email)
        ]).then(([s, a, ann, sess]) => {
          setStats(s);
          setAssignments(a);
          setAnnouncements(ann);
          setSessions(sess);
          setLoading(false);
        });
      });
    }
  }, [session, router]);

  const getThisWeeksClassesCount = () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    
    return sessions.filter(s => {
      const d = new Date(s.startTime);
      return d >= startOfWeek && d < endOfWeek;
    }).length;
  };

  const getTodaysSessions = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return sessions.filter(s => new Date(s.startTime).toISOString().split("T")[0] === todayStr);
  };

  const todaysSessions = getTodaysSessions();

  const statsGrid = stats ? [
    { label: "Classes This Week", val: getThisWeeksClassesCount().toString(), sub: "Active weekly target", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Attendance Rate", val: `${stats.attendanceRate}%`, sub: "✅ Above target (90%)", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Avg Mock Score", val: `${stats.mockScore}%`, sub: "A* gap: 4% — close!", icon: Target, color: "text-[var(--gold)]", bg: "bg-amber-50" },
    { label: "Chapters Done", val: `${stats.chaptersDone}/${stats.totalChapters}`, sub: `${stats.totalChapters > 0 ? Math.round((stats.chaptersDone / stats.totalChapters) * 100) : 0}% curriculum done`, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-50" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[var(--navy)] text-white rounded-3xl p-8 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Welcome back, <span className="text-[var(--gold)]">{session?.user?.name || "Student"}</span> 👋</h2>
            <p className="text-white/60 font-medium max-w-md leading-relaxed">
              You have <strong>{todaysSessions.length} classes</strong> today and <strong>{assignments.filter(a => a.status === 'pending').length} assignments</strong> pending.
            </p>
            <div className="flex gap-3 mt-6">
              <button className="px-5 py-2.5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all">View Schedule</button>
              <button className="px-5 py-2.5 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">My Progress</button>
            </div>
          </div>
          <div className="hidden lg:block">
             <div className="w-24 h-24 bg-[var(--gold)] rounded-3xl flex items-center justify-center -rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-2xl">
                <GraduationCap size={48} className="text-black" />
             </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>

      {/* Missed Class Alert */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2 duration-500">
        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
          You missed <strong>A Level Chemistry</strong> on Mon 5 May. <span className="underline cursor-pointer ml-1">Request Reschedule →</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsGrid.map((s, i) => (
          <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${s.bg} dark:bg-white/10 ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
                <p className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase">{s.val}</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-1">{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>


      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Today's Classes */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} className="text-[var(--gold)]" /> Today's Classes
              </h3>
              <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} className="text-[var(--gold)]" /> {tz}
              </div>
            </div>
            
            <div className="space-y-4">
              {todaysSessions.length === 0 ? (
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest p-4">No classes scheduled for today.</p>
              ) : todaysSessions.map((c, i) => {
                const startStr = new Date(c.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const endStr = new Date(c.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-[var(--border-subtle)] group">
                    <div className="w-1.5 h-12 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{startStr} – {endStr}</p>
                      <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.subject}</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-0.5">{c.teacher?.name || "Teacher"} · {c.topic || "Regular Class"}</p>
                    </div>
                    {c.zoomLink && (
                      <a href={c.zoomLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#2D8CFF] text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
                        <Video size={14} /> Join
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="w-full mt-6 py-3 text-[10px] font-black text-[var(--gold)] uppercase tracking-widest hover:underline flex items-center justify-center gap-2">
              Full Weekly Schedule <ArrowRight size={14} />
            </button>
          </div>

          {/* Assignments */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <CheckSquare size={16} className="text-[var(--gold)]" /> Assignments Due
            </h3>
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest p-4">No assignments due.</p>
              ) : assignments.map((a, i) => {
                const dueStr = new Date(a.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                const isOverdue = new Date(a.dueDate) < new Date() && a.status === "pending";
                const badgeColor = a.status === "graded" ? "bg-emerald-100 text-emerald-800" 
                                 : a.status === "submitted" ? "bg-blue-100 text-blue-800" 
                                 : isOverdue ? "bg-rose-100 text-rose-800" 
                                 : "bg-amber-100 text-amber-800";
                const badgeText = a.status === "graded" ? "Graded" 
                                : a.status === "submitted" ? "Submitted" 
                                : isOverdue ? "Overdue" 
                                : "Pending";
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl group border border-transparent hover:border-[var(--border-subtle)] transition-all">
                    <div>
                      <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{a.title}</p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-0.5 tracking-tight">Due: {dueStr}</p>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Progress Snapshot */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--gold)]" /> Progress Snapshot
            </h3>
            <div className="space-y-6">
              {stats?.subjects.map((p: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">{p.label}</span>
                    <span className="text-[10px] font-black text-[var(--gold)]">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${p.pct}%`, backgroundColor: p.color }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
              <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Target size={14} /> 🎯 A* Gap Analysis
              </p>
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 leading-relaxed uppercase tracking-tight">
                Physics is your biggest gap to A* (12%). Focus on <strong>Forces</strong> and <strong>Electricity</strong> chapters this week.
              </p>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Megaphone size={16} className="text-[var(--gold)]" /> Announcements
            </h3>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No announcements yet.</p>
              ) : announcements.map((n: any, i: number) => (
                <div key={n.id} className={`p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border-l-4 ${n.priority === 'high' ? 'border-[var(--gold)]' : 'border-blue-500'} rounded-r-xl group hover:bg-[var(--gold)]/5 transition-all`}>
                  <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">{n.title}</p>
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Admin · {new Date(n.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
                  <p className="text-[10px] font-medium text-[var(--text-muted)] mt-2 leading-relaxed">{n.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap size={16} className="text-[var(--gold)]" /> Quick Access
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Zoom', icon: Video, color: 'text-[#2D8CFF]', href: 'https://zoom.us' },
                { label: 'GCR', icon: GraduationCap, color: 'text-emerald-500', href: 'https://classroom.google.com' },
                { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600', href: 'https://wa.me/447000000000' },
                { label: 'Mock', icon: Clock, color: 'text-[var(--gold)]', href: '/portal/student/mock' },
                { label: 'Curriculum', icon: FileText, color: 'text-blue-500', href: '/portal/student/curriculum' },
                { label: 'Support', icon: LayoutDashboard, color: 'text-red-500', href: '/portal/student/support' },
              ].map((link, i) => (
                <a key={i} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-transparent rounded-2xl hover:border-[var(--gold)] transition-all group">
                  <link.icon size={20} className={`${link.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

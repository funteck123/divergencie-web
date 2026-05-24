"use client";

import { useState, useEffect } from "react";
import { getStudentSessions } from "@/lib/actions/progress";
import { useSession } from "next-auth/react";
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
  MoreVertical
} from "lucide-react";

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

export default function StudentClassesPage() {
  const { data: session } = useSession();
  const [tz, setTz] = useState("UTC+0");
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset() / 60;
      setTz(`${zone.split('/').pop()?.replace(/_/g,' ')} (UTC${offset >= 0 ? '+' : ''}${offset})`);
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;
    setLoadingSessions(true);
    getStudentSessions(session.user.email).then(s => { setSessions(s); setLoadingSessions(false); });
  }, [session]);

  const SUBJECT_COLORS = ['#3b82f6','var(--gold)','#ef4444','#a855f7','#10b981'];
  // map sessions to calendar slots for current week
  const weekStart = new Date(viewDate);
  weekStart.setDate(viewDate.getDate() - ((viewDate.getDay() + 6) % 7)); // Monday
  const CLASSES = sessions.map((s: any, i: number) => {
    const d = new Date(s.startTime);
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    const hour = d.getHours() + d.getMinutes() / 60;
    const endD = new Date(s.endTime);
    const duration = (endD.getTime() - d.getTime()) / 3600000;
    return { day: dayIdx, hour, duration, subject: s.subject, instructor: s.teacher?.name ?? '—',
      type: s.subject.toLowerCase().replace(/\s+/g,''), zoomLink: s.zoomLink,
      color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], raw: s };
  });
  const today = new Date();
  const todayDayIdx = (today.getDay() + 6) % 7;
  const todayClasses = CLASSES.filter(c => c.day === todayDayIdx);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Class Schedule</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage your weekly sessions and join live classrooms.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsRescheduleOpen(true)} className="px-5 py-2.5 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white hover:border-[var(--gold)] transition-all flex items-center gap-2">
            <Clock size={14} className="text-[var(--gold)]" /> Request Reschedule
          </button>
        </div>
      </div>

      {/* Timezone & Week Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] p-4 rounded-2xl shadow-sm">
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
            <button className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full text-[var(--text-muted)] transition-all"><ChevronLeft size={20} /></button>
            <span className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">12 May – 18 May 2025</span>
            <button className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full text-[var(--text-muted)] transition-all"><ChevronRight size={20} /></button>
          </div>
          <button className="text-[10px] font-black text-[var(--gold)] uppercase border border-[var(--gold)] px-4 py-1.5 rounded-full hover:bg-[var(--gold)] hover:text-black transition-all">Today</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-[var(--bg-secondary)] dark:bg-white/5 border-b border-[var(--border-subtle)]">
            <div className="p-4 border-r border-[var(--border-subtle)]"></div>
            {WEEK_DAYS.map((day, i) => (
              <div key={day} className={`p-4 text-center border-r border-[var(--border-subtle)] last:border-0 ${i === 0 ? 'bg-[var(--gold)] text-black' : ''}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-black/60' : 'text-[var(--text-muted)]'}`}>{day}</p>
                <p className="text-sm font-black mt-0.5">{12 + i}</p>
              </div>
            ))}
          </div>
          
          <div className="relative overflow-y-auto max-h-[600px] grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Time Column */}
            <div className="flex flex-col">
              {HOURS.map(h => (
                <div key={h} className="h-20 p-2 text-[9px] font-black text-[var(--text-muted)] text-right border-r border-b border-[var(--border-subtle)] uppercase">
                  {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                </div>
              ))}
            </div>
            
            {/* Day Columns */}
            {WEEK_DAYS.map((_, dayIdx) => (
              <div key={dayIdx} className="flex flex-col border-r border-[var(--border-subtle)] last:border-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="h-20 border-b border-[var(--border-subtle)]"></div>
                ))}
                
                {/* Class Pills */}
                {CLASSES.filter(c => c.day === dayIdx).map((c, i) => (
                  <div 
                    key={i} 
                    className={`absolute left-1 right-1 rounded-xl p-2 border-l-4 shadow-sm group cursor-pointer transition-all hover:scale-[1.02] hover:z-10 bg-white dark:bg-[#111] border-[var(--border-subtle)] hover:border-[var(--gold)]`}
                    style={{ 
                      top: `${(c.hour - 8) * 80 + 4}px`, 
                      height: `${c.duration * 80 - 8}px`,
                      borderLeftColor: c.type === 'math' ? '#3b82f6' : c.type === 'chem' ? 'var(--gold)' : c.type === 'phys' ? '#ef4444' : '#a855f7'
                    }}
                  >
                    <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">{c.hour}:00</p>
                    <p className="text-[10px] font-black text-[var(--navy)] dark:text-white leading-tight uppercase">{c.subject}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mt-1">{c.instructor}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel: Today's Detail & Attendance */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Clock size={16} className="text-[var(--gold)]" /> Sessions Today
            </h3>
            
            <div className="space-y-4">
              {[
                { subject: 'IGCSE Mathematics', time: '09:00 – 10:00', instructor: 'Mr. Shah', topic: 'Quadratic Equations', color: 'bg-blue-500' },
                { subject: 'A Level Chemistry', time: '14:00 – 15:30', instructor: 'Ms. Priya', topic: 'Chemical Equilibrium', color: 'bg-[var(--gold)]' },
              ].map((c, i) => (
                <div key={i} className="p-6 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-2xl group hover:border-[var(--gold)] transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-1 h-8 ${c.color} rounded-full`}></div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{c.time}</p>
                      <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.subject}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      <User size={12} className="text-[var(--gold)]" /> {c.instructor}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      <BookOpen size={12} className="text-[var(--gold)]" /> {c.topic}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 bg-[#2D8CFF] text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
                      <Video size={12} /> Join Zoom
                    </button>
                    <button className="py-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:border-[var(--gold)]">
                      <Monitor size={12} /> Board
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Tracker */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <History size={16} className="text-[var(--gold)]" /> Recent Attendance
            </h3>
            <div className="space-y-4">
              {[
                { date: 'Mon 12 May', subject: 'IGCSE Maths', status: 'Present', color: 'text-emerald-500' },
                { date: 'Fri 9 May', subject: 'A Level Bio', status: 'Excused', color: 'text-amber-500' },
                { date: 'Wed 7 May', subject: 'IGCSE Physics', status: 'Present', color: 'text-emerald-500' },
                { date: 'Mon 5 May', subject: 'A Level Chem', status: 'Missed', color: 'text-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-xl transition-all group">
                  <div>
                    <p className="text-[10px] font-black text-[var(--navy)] dark:text-white uppercase">{item.date}</p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{item.subject}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
                    <button className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"><MoreVertical size={14} className="text-[var(--text-muted)]" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Request Reschedule</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Submit request for missed or future classes</p>
              </div>
              <button onClick={() => setIsRescheduleOpen(false)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Class to Reschedule</label>
                <select className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none">
                  <option>A Level Chem — Mon 5 May (Missed)</option>
                  <option>IGCSE Physics — Wed 14 May (Future)</option>
                  <option>A Level Bio — Thu 15 May (Future)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Preferred New Slot</label>
                <input type="text" placeholder="e.g. Next Saturday, 11 AM" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black outline-none focus:border-[var(--gold)]" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Reason</label>
                <textarea rows={3} placeholder="Briefly explain the need for reschedule..." className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>

              <button type="submit" className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                <Send size={14} /> Send Request
              </button>
            </form>

            <div className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border-t border-[var(--border-subtle)] text-center">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                Requests are processed within <span className="text-[var(--gold)]">4 hours</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

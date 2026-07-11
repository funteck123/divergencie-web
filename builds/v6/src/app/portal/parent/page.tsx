"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getLinkedChildren } from "@/lib/actions/profile";
import { getParentInvoices } from "@/lib/actions/finance";
import { getStudentAnnouncements } from "@/lib/actions/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart2, 
  CreditCard, 
  LifeBuoy, 
  MessageCircle, 
  Globe, 
  ChevronDown, 
  UserCheck, 
  Target, 
  Calendar, 
  Info, 
  Zap, 
  Megaphone, 
  X, 
  AlertTriangle,
  Send,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Users
} from "lucide-react";

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [tz, setTz] = useState("UTC+0");

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset() / 60;
      setTz(`${zone.split('/').pop()?.replace(/_/g,' ')} (UTC${offset >= 0 ? '+' : ''}${offset})`);
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;
    setLoading(true);
    const u = session.user as any;
    Promise.all([
      getLinkedChildren(session.user.email),
      getParentInvoices(u.id),
      getStudentAnnouncements(),
    ]).then(([kids, invs, anns]) => {
      setChildren(kids);
      if (kids.length > 0) setSelectedChild(kids[0]);
      setOverdueInvoices(invs.filter((i: any) => i.status === 'overdue' || i.status === 'due'));
      setAnnouncements(anns);
      setLoading(false);
    });
  }, [session]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full"></div></div>;
  if (!selectedChild) return <div className="py-24 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No linked students — ask management to link your account.</div>;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      {/* Premium Hero Section */}
      <motion.div variants={item} className="relative overflow-hidden bg-[var(--navy)] rounded-3xl p-10 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-[var(--gold)] text-black text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
              <ShieldCheck size={10} fill="currentColor" /> Parent Account Verified
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Guardian Dashboard v4.0</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight italic mb-2">Family <span className="text-[var(--gold)]">Command</span></h1>
          <p className="text-white/60 font-medium max-w-lg leading-relaxed">
            Welcome back. You are currently viewing progress for <span className="text-white font-black underline decoration-[var(--gold)] underline-offset-4">{selectedChild.name}</span>. 
            {true ? " Manage fees in the Fees tab." : " One invoice is currently outstanding."}
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4">
            <div className="relative">
              <select 
                className="px-8 py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl shadow-[var(--gold)]/20 flex items-center gap-2 appearance-none cursor-pointer pr-12"
                value={selectedChild.id}
                onChange={(e) => setSelectedChild(children.find(ch => ch.id === e.target.value) ?? children[0])}
              >
                {children.map(ch => <option key={ch.id} value={ch.id}>Switch Child: {ch.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
            </div>
            <button onClick={() => setIsSupportOpen(true)} className="px-8 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
              Raise Support Ticket <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Abstract Background Decor */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full text-white">
            <circle cx="150" cy="150" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8 8" />
            <circle cx="150" cy="150" r="120" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M 0,0 C 50,100 150,100 200,0" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedChild.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >
          {overdueInvoices.length > 0 && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-5 rounded-2xl flex items-center gap-4"
            >
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200 flex-1">
                <strong>Attention Required:</strong> {selectedChild.name}&apos;s tuition fee is currently outstanding. Please settle to ensure uninterrupted class access.
              </p>
              <a href="/portal/parent/fees" className="px-4 py-2 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-700 transition-all">Pay Invoice</a>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Attendance", val: selectedChild?.attendanceRate != null ? `${selectedChild.attendanceRate}%` : '—', sub: selectedChild?.attendanceSub ?? '—', icon: UserCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
              { label: "Performance", val: selectedChild?.mockScore != null ? `${selectedChild.mockScore}%` : '—', sub: `Chapters: ${selectedChild?.chaptersDone ?? 0}/${selectedChild?.totalChapters ?? 0}`, icon: Target, color: "text-[var(--gold)]", bg: "bg-amber-50 dark:bg-amber-900/10" },
              { label: "Next Class", val: selectedChild?.nextSession?.subject ?? 'None scheduled', sub: selectedChild?.nextSession ? `${selectedChild.nextSession.time} · ${selectedChild.nextSession.teacher}` : '—', icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm group hover:border-[var(--gold)] transition-all">
                <div className="flex items-start gap-5">
                  <div className={`p-3.5 rounded-xl ${s.bg} ${s.color}`}>
                    <s.icon size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
                    <p className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter">{s.val}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1 italic">{s.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Progress Snapshot */}
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-10 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <BarChart2 size={16} className="text-[var(--gold)]" /> Progress Snapshot
                </h3>
                <a href="/portal/parent/progress" className="text-[10px] font-black text-[var(--gold)] uppercase hover:underline">Full Analytics →</a>
              </div>
              
              <div className="space-y-8">
                {selectedChild.progress.map((p: any, i: number) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{p.subject}</span>
                      <span className="text-[11px] font-black text-[var(--gold)] italic">{p.pct}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        style={{ background: "var(--gold)" }} className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-2xl flex items-start gap-4">
                <Info size={16} className="text-[var(--gold)] shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase leading-relaxed">
                  Progress calculated from completed syllabus chapters and mock results. Last updated: {new Date().toLocaleDateString("en-GB")}.
                </p>
              </div>
            </div>

            {/* Quick Actions & Announcements */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-10 shadow-sm">
                <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                  <Zap size={16} className="text-[var(--gold)]" /> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Pay Fees", icon: CreditCard, color: "text-blue-500", href: "/portal/parent/fees" },
                    { label: "WhatsApp DC", icon: MessageCircle, color: "text-emerald-500", href: "https://wa.me/919650675507" },
                  ].map((a, i) => (
                    <a 
                      key={i}
                      href={a.href}
                      className="flex flex-col items-center justify-center gap-4 p-8 bg-[var(--bg-secondary)] dark:bg-white/10 border border-transparent rounded-2xl hover:border-[var(--gold)] transition-all group text-center"
                    >
                      <div className={`p-3 rounded-xl bg-white dark:bg-white/10 ${a.color} group-hover:scale-110 transition-transform`}>
                        <a.icon size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{a.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--navy)] text-white rounded-3xl p-10 relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                    <Megaphone size={16} className="text-[var(--gold)]" /> DC Announcements
                  </h3>
                  <div className="space-y-6">
                    {announcements.length === 0 ? (
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">No active announcements.</p>
                    ) : announcements.map((n, i) => (
                      <div key={n.id} className={i > 0 ? "pt-6 border-t border-white/10" : ""}>
                        <p className="text-xs font-black uppercase tracking-tight text-[var(--gold)]">{n.title}</p>
                        <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--gold)] opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Support Ticket</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Direct DC Line</p>
                </div>
                <button onClick={() => setIsSupportOpen(false)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>
              
              <form className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Category</label>
                  <select className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none">
                    <option>Billing Query</option>
                    <option>Scheduling</option>
                    <option>Feedback</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Description</label>
                  <textarea rows={3} placeholder="How can we help?" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
                </div>
                <button type="submit" className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Send size={14} /> Send Message
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-40">
        DivergenCIE Guardian Portal · Secure Link Verified · {tz}
      </div>
    </motion.div>
  );
}

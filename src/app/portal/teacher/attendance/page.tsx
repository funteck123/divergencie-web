"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ClipboardCheck, 
  History, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  User, 
  FileText,
  Search,
  Filter,
  Users,
  Plus
} from "lucide-react";

import { logAttendance, getPendingAttendance, getAttendanceHistory, getStudentsForTeacher } from "@/lib/actions/attendance";
import { useSession } from "next-auth/react";

export default function TeacherAttendancePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("submit");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  const fetchAllData = async () => {
    if (session?.user?.email) {
      const [pending, past, students] = await Promise.all([
        getPendingAttendance(session.user!.email!),
        getAttendanceHistory(session.user.email),
        getStudentsForTeacher(session.user.email)
      ]);
      setPendingSessions(pending);
      setHistory(past);
      setAllStudents(students);
      
      // If no pending, default to manual mode if tab is submit
      if (pending.length === 0) {
        setIsManualMode(true);
      }
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [session, isSuccess]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    try {
      if (session?.user?.email) {
        formData.append("teacherId", session.user.email);
        if (isManualMode) {
          formData.set("sessionId", "manual");
        }
        await logAttendance(formData);
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to log attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Attendance Center</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Verify student presence and submit session reports for payroll.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[
          { id: "submit", label: "Pending Logs", icon: ClipboardCheck },
          { id: "history", label: "My History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(null); }}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "submit" && !isSuccess && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            {pendingSessions.length > 0 && !isManualMode ? (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-4 flex-1">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">
                  Attention: You have <strong>{pendingSessions.length} sessions</strong> awaiting verification.
                </p>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            
            <button 
              onClick={() => setIsManualMode(!isManualMode)}
              className={`ml-4 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                isManualMode 
                  ? "bg-[var(--navy)] text-white" 
                  : "bg-white dark:bg-white/10 text-[var(--navy)] dark:text-white border border-[var(--border-subtle)]"
              }`}
            >
              {isManualMode ? <ClipboardCheck size={14} /> : <Plus size={14} />}
              {isManualMode ? "Switch to Scheduled" : "Manual Log Entry"}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
            {!isManualMode && pendingSessions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-4">
                <CheckCircle2 size={48} className="text-emerald-500 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No pending sessions found for verification.</p>
                <button 
                  onClick={() => setIsManualMode(true)}
                  className="mt-2 text-[var(--gold)] font-black uppercase text-[10px] tracking-widest hover:underline"
                >
                  Create manual log instead?
                </button>
              </div>
            ) : (
              <form className="space-y-6" action={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isManualMode ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Student</label>
                        <select name="studentEmail" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none cursor-pointer" required>
                          <option value="">Select Student...</option>
                          {allStudents.map(s => (
                            <option key={s.id} value={s.email}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject / Topic</label>
                        <input name="subject" type="text" placeholder="e.g. Physics - Mechanics" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Session Date</label>
                        <input name="date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" required />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select Scheduled Session</label>
                      <select name="sessionId" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none cursor-pointer" required>
                        <option value="">Select a class...</option>
                        {pendingSessions.map(ps => (
                          <option key={ps.id} value={ps.id}>
                            {new Date(ps.startTime).toLocaleDateString()} - {ps.student.name} ({ps.subject})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Actual Duration (Minutes)</label>
                    <select name="duration" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none cursor-pointer" required>
                      <option value="60">60 Minutes (1 Hour)</option>
                      <option value="90">90 Minutes (1.5 Hours)</option>
                      <option value="120">120 Minutes (2 Hours)</option>
                      <option value="30">30 Minutes (Trial)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Whiteboard / Recording Link</label>
                  <input name="wbLink" type="url" placeholder="https://miro.com/..." className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" required />
                  <p className="text-[8px] font-bold text-amber-600 uppercase mt-1">⚠ Name your board: Subject_StudentName_Date (e.g. Maths_Aanya_2026-05-20)</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Session Notes & Progress</label>
                  <textarea name="notes" rows={3} placeholder="What was covered today? Any specific student feedback?" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--gold)]/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send size={14} /> {loading ? "Submitting Log..." : "Submit Attendance Log"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-[var(--gold)]" /> Verified History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-8 py-4">Session Date</th>
                  <th className="px-8 py-4">Student & Subject</th>
                  <th className="px-8 py-4">Duration</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {history.length > 0 ? history.map((row, i) => (
                  <tr key={i} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{new Date(row.session?.startTime || row.markedAt).toLocaleDateString()}</p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-0.5">Logged {new Date(row.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{row.student.name}</p>
                      <p className="text-[9px] font-bold text-[var(--gold)] uppercase mt-0.5">{row.session.subject}</p>
                    </td>
                    <td className="px-8 py-5 font-black text-[var(--navy)] dark:text-white text-[10px]">{row.duration} min</td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${row.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {row.wbLink && (
                        <a href={row.wbLink} target="_blank" className="text-[var(--gold)] hover:underline flex items-center justify-end gap-1 font-black uppercase text-[9px] tracking-widest ml-auto">
                          Board <ExternalLink size={10} />
                        </a>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic">No submission history found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="py-24 text-center relative overflow-hidden">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 relative z-10"
          >
            <CheckCircle2 size={40} />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Session Verified!</h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2">Attendance recorded. This session is now ready for claim.</p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <button 
                onClick={() => { setIsSuccess(false); setIsManualMode(false); fetchAllData(); }}
                className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
              >
                Log Another
              </button>
              <button 
                onClick={() => { setIsSuccess(false); setActiveTab('history'); }}
                className="px-8 py-3 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
              >
                View History
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

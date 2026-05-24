"use client";

import { useState, useEffect } from "react";
import { 
  Banknote, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MessageCircle,
  CreditCard,
  Calendar,
  FileText,
  ChevronRight,
  TrendingUp,
  Receipt
} from "lucide-react";
import { submitClaim, getTeacherClaims } from "@/lib/actions/claims";
import { getTeacherAttendance } from "@/lib/actions/attendance";
import { getUserProfile } from "@/lib/actions/profile";
import { useSession } from "next-auth/react";

export default function TeacherPaymentClaimsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [isSuccess, setIsSuccess] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(20);
  const MONTHS = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  });
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [claims, setClaims] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      Promise.all([
        getTeacherClaims((session.user as any).id),
        getTeacherAttendance(session.user.email),
        getUserProfile(session.user.email),
      ]).then(([claimsData, attendanceData, profile]) => {
        setClaims(claimsData);
        setAttendance(attendanceData);
        if (profile?.hourlyRate) setHourlyRate(profile.hourlyRate);
      });
    }
  }, [session, isSuccess]);

  const monthAttendance = attendance.filter((a: any) => {
    const date = new Date(a.markedAt ?? a.date ?? a.session?.startTime);
    const monthStr = date.toISOString().slice(0, 7);
    return monthStr === selectedMonth;
  });

  const totalMinutes = monthAttendance.reduce((sum: number, a: any) => sum + (a.duration ?? 60), 0);
  const totalHours = totalMinutes / 60;
  const sessionsCount = monthAttendance.length;
  const estimatedAmount = totalHours * hourlyRate; // from user.hourlyRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", (session.user as any).id!);
      formData.append("month", selectedMonth);
      formData.append("amount", estimatedAmount.toString());
      formData.append("notes", `Automatic claim for ${sessionsCount} sessions.`);
      
      await submitClaim(formData);
      setIsSuccess(true);
    } catch (err) {
      alert("Error submitting claim. Ensure you have sessions logged for this month.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Payment Claims</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Submit monthly claims and track your earnings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab("submit"); setIsSuccess(false); }}
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "submit" ? 'bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white'
          }`}
        >
          Submit Claim
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "history" ? 'bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white'
          }`}
        >
          Claim History
        </button>
      </div>

      {activeTab === "submit" && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sessions Logged</p>
              <p className="text-xl font-black text-[var(--navy)] dark:text-white">{sessionsCount} Sessions</p>
            </div>
            <div className="space-y-1 sm:border-l border-[var(--border-subtle)] sm:pl-6">
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Hours</p>
              <p className="text-xl font-black text-[var(--navy)] dark:text-white">{totalHours.toFixed(1)} Hours</p>
            </div>
            <div className="space-y-1 sm:border-l border-[var(--border-subtle)] sm:pl-6">
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Estimated Amount</p>
              <p className="text-xl font-black text-[var(--gold)]">£ {estimatedAmount.toFixed(2)}</p>
            </div>
          </div>

          {!isSuccess ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-2">
                <Banknote size={20} className="text-[var(--gold)]" />
                <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Claim Details</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Claim Month</label>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]"
                    >
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hourly Rate</label>
                    <div className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl text-xs font-black text-[var(--text-muted)] opacity-60">
                      £ {hourlyRate.toFixed(2)} / hour (Fixed)
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Bank / Payment Details</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input type="text" defaultValue="Barclays ****1234" className="w-full p-4 pl-12 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Notes / Invoice Ref (optional)</label>
                  <textarea placeholder="e.g. Invoice #INV-2026-05, any special notes…" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] min-h-[100px]" />
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <p className="text-[10px] text-yellow-800 dark:text-yellow-500 font-medium leading-relaxed">
                    Ensure all attendance for {MONTHS.find(m => m.value === selectedMonth)?.label ?? selectedMonth} is submitted before claiming. Claims cannot be edited after submission.
                  </p>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--gold)]/20 mt-4 disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit Payment Claim"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-12 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2">Claim Submitted!</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium mb-8">Your claim for {MONTHS.find(m => m.value === selectedMonth)?.label ?? selectedMonth} has been sent for review.</p>
              <button 
                onClick={() => setActiveTab("history")}
                className="px-8 py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
              >
                View Claim History
              </button>
            </div>
          )}

          <a href="https://wa.me/919650675507" target="_blank" className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl hover:brightness-105 transition-all">
            <MessageCircle size={20} className="text-[#25D366]" />
            <span className="text-xs font-black text-green-800 dark:text-green-400 uppercase tracking-widest flex-1">Payment questions? WhatsApp DC directly</span>
            <ChevronRight size={16} className="text-green-600" />
          </a>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Earned (YTD)", val: `£ ${claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`, color: "text-[var(--navy)] dark:text-white" },
              { label: "Total Paid", val: `£ ${claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`, color: "text-green-600" },
              { label: "Pending Review", val: `£ ${claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`, color: "text-[var(--gold)]" },
            ].map((s, i) => (
              <div key={i} className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl shadow-sm">
                <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Claim History</h3>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{claims.length} claims</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {claims.map((c, i) => (
                <div key={i} className="p-6 flex items-center justify-between group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.month}</h4>
                    <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{c.id} · Submitted {c.date} · {c.sessions} sessions</p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className={`text-lg font-black ${c.status === 'paid' ? 'text-green-600' : 'text-[var(--gold)]'}`}>£ {Number(c.amount).toFixed(2)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      c.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

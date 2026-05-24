"use client";

import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, Calendar, Banknote, Zap, Star, Filter, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { getManagementMetrics } from "@/lib/actions/stats";

const DEPT_COLORS: Record<string, string> = {
  PR: "bg-blue-100 text-blue-700",
  HR: "bg-purple-100 text-purple-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Marketing: "bg-amber-100 text-amber-700",
  IT: "bg-gray-100 text-gray-700",
  "—": "bg-slate-100 text-slate-500",
};

export default function ManagementMetricsPage() {
  const [activeCategory, setActiveCategory] = useState("overview");
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getManagementMetrics().then(m => { setMetrics(m); setLoading(false); });
  }, []);

  const CATEGORIES = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "staff", label: "Staff KPIs", icon: Users },
    { id: "financial", label: "Financial", icon: Banknote },
    { id: "activity", label: "Activity", icon: Zap },
  ];

  const ov = metrics?.overview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Metrics</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Live KPIs across all departments and staff.</p>
        </div>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeCategory === c.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <c.icon size={14} />{c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : activeCategory === "overview" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Students", val: ov.activeStudents, sub: `of ${ov.totalStudents} total`, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
              { label: "Open Tickets", val: ov.openTickets, sub: "across all depts", icon: AlertCircle, color: ov.openTickets > 10 ? "text-red-500" : "text-emerald-500", bg: ov.openTickets > 10 ? "bg-red-50 dark:bg-red-900/10" : "bg-emerald-50 dark:bg-emerald-900/10" },
              { label: "Pending Claims", val: ov.pendingClaims, sub: "awaiting approval", icon: Banknote, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
              { label: "Sessions Done", val: ov.totalSessions, sub: `${ov.totalAttendance} attendances`, icon: Calendar, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/10" },
              { label: "Total Staff", val: ov.totalStaff, sub: "active headcount", icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/10" },
              { label: "Open Leads", val: ov.leads, sub: "not passed to PR", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
              { label: "Missed Posts", val: ov.missedPosts, sub: "marketing SLA breach", icon: AlertCircle, color: ov.missedPosts > 2 ? "text-red-500" : "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
              { label: "Ambassadors", val: ov.ambassadors, sub: "active programme", icon: Star, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/10" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm hover:border-[var(--gold)] transition-all">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] italic mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      ) : activeCategory === "staff" ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Staff Performance — All Depts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Dept</th>
                  <th className="px-6 py-4">Sessions Logged</th>
                  <th className="px-6 py-4">Hours Claimed</th>
                  <th className="px-6 py-4">Tickets Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {(metrics?.staff?.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-[var(--text-muted)] uppercase">No staff data yet — add staff users and log attendance</td></tr>
                ) : (metrics?.staff ?? []).map((s: any) => (
                  <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{s.name}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${DEPT_COLORS[s.dept] ?? DEPT_COLORS["—"]}`}>{s.dept}</span>
                    </td>
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">{s.totalSessions}</td>
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">{s.totalHours ? `${s.totalHours}h` : '—'}</td>
                    <td className="px-6 py-5">
                      <span className={`font-black text-[10px] ${s.closedTickets > 5 ? 'text-emerald-500' : s.closedTickets > 0 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>{s.closedTickets}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeCategory === "financial" ? (
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6">Claims Summary</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{ov.pendingClaims} claims pending approval. Go to Claims Approval to review.</p>
            <a href="/portal/management" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-[var(--gold)] uppercase hover:underline">Review Claims →</a>
          </div>
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6">Invoice Status</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Full invoice analytics available in Finance portal. {ov.activeStudents} active students.</p>
            <a href="/portal/staff/finance/invoices" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-[var(--gold)] uppercase hover:underline">Open Finance Portal →</a>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm animate-in fade-in duration-300">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-4">Platform Activity</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Sessions Completed", val: ov.totalSessions },
              { label: "Attendance Records", val: ov.totalAttendance },
              { label: "Open Leads", val: ov.leads },
            ].map((s, i) => (
              <div key={i} className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl">
                <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

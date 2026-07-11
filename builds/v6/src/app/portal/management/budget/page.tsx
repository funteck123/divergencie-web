"use client";

import { useState, useEffect } from "react";
import { PieChart, Banknote, Target, CheckCircle2, X, Clock, Loader2, AlertCircle } from "lucide-react";
import { getBudgetOverview, getClaimsForApproval, approveClaim, rejectClaim } from "@/lib/actions/finance";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-gray-100 text-gray-600",
};

export default function ManagementBudgetPage() {
  const [activeTab, setActiveTab] = useState("claims");
  const [budget, setBudget] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([getBudgetOverview(), getClaimsForApproval()]);
      setBudget(b);
      setClaims(c);
    } catch (err: any) {
      console.error("Error loading budget data:", err);
      setError(err?.message || "Failed to load budget and claims data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await approveClaim(id);
    await load();
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await rejectClaim(id);
    await load();
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Budget & Claims</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Review and approve staff claims. Track company budget.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Overview cards */}
      {!loading && budget && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Revenue Collected", val: `£${budget.revenue.toFixed(0)}`, icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
            { label: "Revenue Pending", val: `£${budget.pendingRevenue.toFixed(0)}`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
            { label: "Claims Paid", val: `£${budget.totalPaid.toFixed(0)}`, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
            { label: "Claims to Pay", val: `£${budget.totalApproved.toFixed(0)}`, icon: AlertCircle, color: budget.totalApproved > 0 ? "text-red-500" : "text-gray-400", bg: budget.totalApproved > 0 ? "bg-red-50 dark:bg-red-900/10" : "bg-gray-50 dark:bg-white/5" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[{ id: "claims", label: "Claims Approval", icon: Banknote }, { id: "budget", label: "Budget Planner", icon: PieChart }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === t.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : activeTab === "claims" ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Pending Claims — {claims.length} awaiting review</h3>
          </div>
          {claims.length === 0 ? (
            <div className="py-20 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No pending claims.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Sessions</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {claims.map((c: any) => (
                    <tr key={c.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-5">
                        <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{c.user.name}</p>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{c.user.dept ?? c.user.role}</p>
                      </td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[10px]">{c.month}</td>
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">{c.sessions ?? '—'}</td>
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">{c.hours ? `${c.hours}h` : '—'}</td>
                      <td className="px-6 py-5 font-black text-[var(--gold)]">£{c.amount}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[c.status.toLowerCase()] ?? "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleApprove(c.id)} disabled={processing === c.id}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                            {processing === c.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Approve
                          </button>
                          <button onClick={() => handleReject(c.id)} disabled={processing === c.id}
                            className="px-3 py-1 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-full hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                            <X size={10} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-4">Quarterly Budget Cycle</h3>
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase leading-relaxed">Finance submits quarterly budget proposal → Management approves/adjusts/rejects → Finance notified. Budget submission UI is in Finance portal at <a href="/portal/staff/finance/rates" className="text-[var(--gold)] hover:underline">/portal/staff/finance/rates</a>.</p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Revenue vs Payroll</p>
                <p className="text-xl font-black text-[var(--navy)] dark:text-white">£{budget?.revenue?.toFixed(0) ?? 0} in / £{(budget?.totalPaid + budget?.totalApproved)?.toFixed(0) ?? 0} out</p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Net Position</p>
                <p className={`text-xl font-black ${(budget?.revenue - budget?.totalPaid - budget?.totalApproved) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  £{((budget?.revenue ?? 0) - (budget?.totalPaid ?? 0) - (budget?.totalApproved ?? 0)).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { 
  Receipt, 
  History, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowRight,
  Send,
  MoreVertical,
  Banknote
} from "lucide-react";
import { getClaims, submitClaim, getMonthlyStats } from "@/lib/actions/claims";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";

export default function StaffClaimsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("submit");
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ events: 0, hours: 0, estimatedAmount: 0, hourlyRate: 20 });

  useEffect(() => {
    if (session?.user?.email) {
      const userId = (session.user as any).id;
      const currentMonth = new Date().toLocaleDateString('en-GB', {month:'long', year:'numeric'});
      Promise.all([
        getClaims(userId),
        getMonthlyStats(session.user.email, currentMonth),
      ]).then(([claimsData, statsData]) => {
        setClaims(claimsData);
        setStats(statsData);
      });
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("userId", (session?.user as any)?.id!);
    formData.append("amount", stats.estimatedAmount.toString());

    try {
      await submitClaim(formData);
      const updated = await getClaims((session?.user as any)?.id!);
      setClaims(updated);
      alert("Claim submitted successfully!");
      setActiveTab("history");
    } catch (err) {
      alert("Error submitting claim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Payment Claims</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Submit monthly session logs for management approval and payout.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[
          { id: "submit", label: "Submit Claim", icon: Plus },
          { id: "history", label: "Claim History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
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

      {activeTab === "submit" && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Submission Form */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <Receipt size={20} className="text-[var(--gold)]" />
              <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">New Monthly Claim</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Claim Month</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input name="month" required type="month" className="w-full p-4 pl-12 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total Events</label>
                  <input type="text" readOnly value={stats.events} className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl text-xs font-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total Hours</label>
                  <input type="text" readOnly value={stats.hours.toFixed(2)} className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl text-xs font-black outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Internal Notes</label>
                <textarea name="notes" rows={3} placeholder="Provide context for any rescheduled sessions..." className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase leading-relaxed">
                  Estimated Payout: £{stats.estimatedAmount.toFixed(2)}
                </p>
              </div>

              <button disabled={loading} type="submit" className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--gold)]/20 flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={14} /> {loading ? "Submitting..." : "Submit Claim for Review"}
              </button>
            </form>

          </div>

          {/* Guidelines */}
          <div className="space-y-6">
            <div className="bg-[var(--navy)] text-white rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-2">Claim Policy</h3>
                <ul className="space-y-3 mt-6">
                  {[
                    "Claims must be submitted by the 5th of each month",
                    "Only verified attendance logs are eligible for payout",
                    "Discrepancies will trigger a mandatory management audit",
                    "Payouts are processed within 3-5 business days of approval"
                  ].map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs font-medium text-white/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-1.5 shrink-0"></div>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            </div>
            
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 flex items-center justify-between group hover:border-[var(--gold)] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Base Rate</p>
                  <p className="text-lg font-black text-[var(--navy)] dark:text-white uppercase">£{stats.hourlyRate.toFixed(2)} / hr</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-[var(--gold)]" /> Claim Audit Trail
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Events</th>
                  <th className="px-6 py-4">Total Hours</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {claims.map((h, i) => (
                  <tr key={i} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{h.month}</td>
                    <td className="px-6 py-5 font-bold text-[var(--text-muted)]">--</td>
                    <td className="px-6 py-5 font-bold text-[var(--navy)] dark:text-white">£{h.amount.toFixed(2)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        h.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                        h.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg transition-all text-[var(--text-muted)]">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

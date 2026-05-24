"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Ticket, 
  Clock, 
  CheckCircle2, 
  LifeBuoy, 
  ArrowRight,
  Plus,
  Copy,
  TrendingUp,
  Banknote,
  Users,
  ExternalLink,
  Gift
} from "lucide-react";
import { useSession } from "next-auth/react";
import { getAmbassadorData } from "@/lib/actions/ambassador";

export default function AmbassadorDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.email) {
      getAmbassadorData(session.user.email).then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [session]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading) return <div className="p-8 text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Ambassador Data...</div>;
  if (!data) return <div className="p-8 text-[10px] font-black uppercase tracking-widest opacity-40">Ambassador profile not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Ambassador Portal</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Grow the DivergenCIE family and track your rewards.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Referral Card */}
        <div className="lg:col-span-2 bg-[var(--navy)] text-white rounded-3xl p-8 relative overflow-hidden group shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <Gift size={20} className="text-[var(--gold)]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Your Referral Identity</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-1">
                <p className="text-xs font-bold text-white/60 uppercase tracking-tight mb-2">Share this code with students</p>
                <div className="flex items-center gap-4">
                  <div className="px-6 py-4 bg-white/10 border border-white/20 rounded-2xl font-black text-2xl tracking-[0.2em] text-[var(--gold)]">
                    {data.user.referralCode}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(data.user.referralCode)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              </div>
              
              <div className="w-px h-16 bg-white/10 hidden md:block"></div>
              
              <div className="flex-1">
                <p className="text-xs font-bold text-white/60 uppercase tracking-tight mb-2">Or share your unique link</p>
                <button 
                  onClick={() => copyToClipboard(`https://divergencie.co.uk?ref=${data.user.referralCode}`)}
                  className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--gold)] hover:underline"
                >
                  Copy Referral Link <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--gold)] opacity-5 rounded-full blur-3xl"></div>
        </div>

        {/* Earnings Card */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Banknote size={20} className="text-emerald-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Earnings (MAY)</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Fixed Allowance</span>
                <span className="text-xs font-black">£{data.earnings.allowance}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-500">
                <span className="text-[10px] font-black uppercase">Commission ({data.referrals.filter((r:any) => r.status === 'converted').length})</span>
                <span className="text-xs font-black">+£{data.earnings.commission}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Total Payout Pending</p>
            <p className="text-3xl font-black text-[var(--navy)] dark:text-white">£{data.earnings.total}</p>
          </div>
        </div>
      </div>

      {/* Stats and Activity */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">


          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6">Funnel Performance</h3>
            <div className="space-y-6">
              {[
                { label: 'Total Referrals', val: data.referrals.length, icon: Users, color: 'text-blue-500' },
                { label: 'Successful Enrolments', val: data.referrals.filter((r:any) => r.status === 'converted').length, icon: CheckCircle2, color: 'text-emerald-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <s.icon size={16} className={s.color} />
                    <span className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">{s.label}</span>
                  </div>
                  <span className="text-xl font-black">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Recent Activity</h3>
            <button className="text-[9px] font-black text-[var(--gold)] uppercase hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            {data.referrals.length > 0 ? data.referrals.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-transparent hover:border-[var(--gold)] rounded-xl transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <TrendingUp size={16} className="text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
                  <div>
                    <p className="text-xs font-bold text-[var(--navy)] dark:text-white">New Referral Visit — {item.code}</p>
                    <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase mt-0.5 tracking-tight">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${item.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.status}
                  </span>
                  <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )) : (
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic text-center py-8">No referral activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-12 text-center shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <div className="w-16 h-16 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            <LifeBuoy size={32} className="text-[var(--gold)]" />
          </div>
          <h3 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-3">Need Assistance?</h3>
          <p className="text-sm font-medium text-[var(--text-muted)] max-w-sm mx-auto mb-8">
            Raise a ticket for any queries, campaign support, or system issues.
          </p>
          <button className="px-8 py-4 bg-[var(--navy)] text-white dark:bg-[var(--gold)] dark:text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center gap-3 mx-auto">
            <Plus size={16} /> Raise New Ticket
          </button>
        </div>
      </div>
    </div>
  );
}


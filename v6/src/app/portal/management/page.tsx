"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Ticket, 
  Banknote, 
  TrendingUp, 
  Activity, 
  UserPlus, 
  Link as LinkIcon, 
  Download, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  ArrowUpRight,
  MoreVertical,
  Clock
} from "lucide-react";
import { getGlobalStats, getRecentActivity, approveClaim, getDepartmentAudit, getManagementDashboardData, getManagementTrends } from "@/lib/actions/stats";
import TrendWidget from "@/components/portal/management/TrendWidget";
import { getTeacherClaims } from "@/lib/actions/claims";

function ManagementDashboardInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [liveTime, setLiveTime] = useState("");
  const [statsData, setStatsData] = useState({ students: 0, staff: 0, tickets: 0, claims: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [urgentTickets, setUrgentTickets] = useState<any[]>([]);
  const [deptAudit, setDeptAudit] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setLiveTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    // Fetch all data in parallel
    Promise.all([
      getGlobalStats(),
      getRecentActivity(),
      getDepartmentAudit(),
      getManagementTrends(),
      getManagementDashboardData(),
    ]).then(([stats, activity, audit, trends, dash]) => {
      setStatsData(stats);
      setActivity(activity);
      setDeptAudit(audit);
      setTrends(trends);
      setPendingClaims(dash.pendingClaims);
      setUrgentTickets(dash.urgentTickets);
    });

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    setLoading(true);
    await approveClaim(id);
    // Refresh in parallel
    Promise.all([getGlobalStats(), getManagementTrends(), getManagementDashboardData()])
      .then(([stats, trends, dash]) => {
        setStatsData(stats);
        setTrends(trends);
        setPendingClaims(dash.pendingClaims);
        setUrgentTickets(dash.urgentTickets);
      });
    setLoading(false);
  };

  const filteredActivity = activity.filter(a => a.text.toLowerCase().includes(query.toLowerCase()));
  const filteredClaims = pendingClaims.filter(c => c.user?.name?.toLowerCase().includes(query.toLowerCase()));
  const filteredTickets = urgentTickets.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

  const stats = [
    { label: "Total Students", val: statsData.students.toString(), sub: "Active enrolments", icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
    { label: "Active Staff", val: statsData.staff.toString(), sub: "Teaching + ops", icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-100" },
    { label: "Open Tickets", val: statsData.tickets.toString(), sub: "Unresolved issues", icon: Ticket, color: "text-red-500", bg: "bg-red-100" },
    { label: "Pending Claims", val: statsData.claims.toString(), sub: "Awaiting approval", icon: Banknote, color: "text-[var(--gold)]", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Command Center</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Global oversight and real-time operational control.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black text-[var(--navy)] dark:text-white tracking-widest uppercase flex items-center gap-2">
            <Clock size={14} className="text-[var(--gold)]" /> {liveTime}
          </div>
        </div>
      </div>

      {/* Alert Strip */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-500">
        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
          <strong>2 payment claims</strong> awaiting your approval. <Link href="/portal/staff/finance/claims" className="underline cursor-pointer ml-1">Review pending payouts</Link>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${s.bg} dark:bg-white/10 ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
                <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-1">{s.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Add User", icon: UserPlus, href: "/portal/management/users" },
          { label: "Invite Link", icon: LinkIcon, onClick: () => alert("Link Copied") },
          { label: "Export Data", icon: Download, onClick: () => alert("Exporting...") },
          { label: "WhatsApp DC", icon: MessageCircle, href: "https://wa.me/919650675507" },
        ].map((a, i) => (
          <button 
            key={i}
            onClick={a.onClick}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl group hover:border-[var(--gold)] transition-all shadow-sm"
          >
            <div className="p-3 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
              <a.icon size={20} className="text-[var(--gold)]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrolment Trend */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--gold)]" /> Enrolment Trend — 2025
            </h3>
            <div className="text-right">
              <p className="text-xl font-black text-[var(--navy)] dark:text-white">38</p>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">+6 THIS MONTH</p>
            </div>
          </div>
          
          <div className="h-48 w-full relative group">
            <svg viewBox="0 0 400 100" className="w-full h-full preserve-3d overflow-visible">
              <path 
                d="M 0,80 Q 50,70 100,60 T 200,40 T 300,20 T 400,10" 
                fill="none" 
                stroke="var(--gold)" 
                strokeWidth="4" 
                strokeLinecap="round"
                className="drop-shadow-lg"
              />
              <path 
                d="M 0,80 Q 50,70 100,60 T 200,40 T 300,20 T 400,10 L 400,100 L 0,100 Z" 
                fill="url(#grad)" 
                fillOpacity="0.1"
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--gold)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              {[18, 22, 26, 32, 38].map((v, i) => (
                <circle 
                  key={i} 
                  cx={i * 100} 
                  cy={100 - (v * 2)} 
                  r="4" 
                  fill="var(--gold)" 
                  className="hover:r-6 transition-all cursor-pointer"
                />
              ))}
            </svg>
            <div className="flex justify-between mt-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 mb-8">
            <Activity size={16} className="text-[var(--gold)]" /> Recent Activity
          </h3>
          <div className="space-y-6">
            {filteredActivity.map((a, i) => (
              <div key={i} className="flex gap-4 group">
                <div className={`w-2 h-2 rounded-full ${a.type === 'ticket' ? 'bg-red-500' : 'bg-[var(--gold)]'} mt-1.5 shrink-0 group-hover:scale-150 transition-transform`}></div>
                <div>
                  <p className="text-xs font-bold text-[var(--navy)] dark:text-white leading-relaxed">{a.text}</p>
                  <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1 uppercase tracking-tight">{new Date(a.time).toLocaleString()} · {a.author}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--gold)] hover:text-black transition-all">
            View All Events
          </button>
        </div>
      </div>

      {/* 8-Week Trend Widget */}
      {trends && (
        <TrendWidget
          labels={trends.labels}
          sessions={trends.sessions}
          tickets={trends.tickets}
          leads={trends.leads}
        />
      )}

      {/* Department Audit */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
        <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
          <Activity size={16} className="text-emerald-500" /> Cross-Department Audit
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {deptAudit.map((d, i) => (
            <div key={i} className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">{d.name}</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-[var(--text-muted)]">Tickets</span>
                  <span className="text-xs font-black">{d.tickets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-[var(--text-muted)]">Meetings</span>
                  <span className="text-xs font-black">{d.meetings}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Action Queues */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Claims */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8">Pending Payouts</h3>
          <div className="space-y-6">
            {filteredClaims.length > 0 ? filteredClaims.map((c, i) => (
              <div key={i} className="p-5 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">{c.user?.name || "Teacher"}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">{c.month} · {c.hours.toFixed(1)}h · {c.sessions} sessions</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-[var(--gold)]">£{c.amount.toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(c.id)} disabled={loading} className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"><CheckCircle2 size={16} /></button>
                    <Link href="/portal/staff/finance/claims" className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all"><XCircle size={16} /></Link>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic text-center py-8">No pending claims.</p>
            )}
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8">Urgent Support</h3>
          <div className="space-y-4">
            {filteredTickets.length > 0 ? filteredTickets.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-xl transition-all group">
                <div className="flex gap-4 items-start">
                  <div className="text-[10px] font-black text-[var(--text-muted)] mt-1">{t.id.slice(-8).toUpperCase()}</div>
                  <div>
                    <p className="text-xs font-bold text-[var(--navy)] dark:text-white group-hover:text-[var(--gold)] transition-colors">{t.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5 tracking-tight">{t.status} · {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)]">
                  <ChevronRight size={16} />
                </button>
              </div>
            )) : (
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic text-center py-8">Queue clear.</p>
            )}
          </div>
          <button className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--gold)] hover:underline flex items-center justify-center gap-2">
            Go to Global Ticket Center <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagementDashboard() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24 text-[var(--gold)] font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
      <ManagementDashboardInner />
    </Suspense>
  );
}

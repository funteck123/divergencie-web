"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertCircle, 
  Inbox, 
  Flame, 
  MessageCircle,
  Map,
  CalendarCheck,
  Calendar,
  UserPlus,
  Database,
  FileText,
  Calculator,
  Receipt,
  Image,
  Star,
  Key,
  Server,
  Activity,
  Megaphone,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  Cpu,
  Users,
  Ticket,
  Banknote as BanknoteIcon
} from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { getStaffDashboardData } from "@/lib/actions/stats";

type Dept = "PR" | "HR" | "Finance" | "Marketing" | "IT";
type Role = "supervisor" | "member";

export default function StaffDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<{ tickets: any[], announcements: any[] }>({ tickets: [], announcements: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const user = session?.user as any;

  useEffect(() => {
    if (user?.dept) {
      getStaffDashboardData(user.dept).then(setData);
    }
  }, [user?.dept]);

  if (!user) return null;

  const dept = (user.dept || "PR") as Dept;
  const role = (user.supervisor ? "supervisor" : "member") as Role;

  const DEPT_CONFIG = {
    PR: { label: "PR / Operations", bg: "bg-amber-100", text: "text-amber-700", icon: ClipboardList },
    HR: { label: "HR", bg: "bg-red-100", text: "text-red-700", icon: Users },
    Finance: { label: "Finance", bg: "bg-emerald-100", text: "text-emerald-700", icon: BanknoteIcon },
    Marketing: { label: "Marketing", bg: "bg-blue-100", text: "text-blue-700", icon: TrendingUp },
    IT: { label: "IT", bg: "bg-purple-100", text: "text-purple-700", icon: Cpu },
  };

  const DEPT_ACTIONS: Record<Dept, { label: string; icon: any; href: string }[]> = {
    PR: [
      { label: "Batch Mapping", icon: Map, href: "/portal/staff/shared/schedule" },
      { label: "PR Tickets", icon: Inbox, href: "/portal/staff/tickets" },
      { label: "Attend Log", icon: CalendarCheck, href: "/portal/staff/shared/meetings" },
      { label: "Manage Schedule", icon: Calendar, href: "/portal/staff/shared/schedule" },
    ],
    HR: [
      { label: "Candidates", icon: UserPlus, href: "/portal/staff/hr/candidates" },
      { label: "Staff Records", icon: Database, href: "/portal/staff/hr/records" },
      { label: "HR Tickets", icon: Inbox, href: "/portal/staff/tickets" },
    ],
    Finance: [
      { label: "Issue Invoice", icon: FileText, href: "/portal/staff/finance/invoices" },
      { label: "Rate Card Manager", icon: Calculator, href: "/portal/staff/finance/rates" },
      { label: "Claims Queue", icon: Receipt, href: "/portal/staff/finance/claims" },
    ],
    Marketing: [
      { label: "Lead Handoff", icon: UserPlus, href: "/portal/staff/marketing/leads" },
      { label: "Post Calendar", icon: Image, href: "/portal/staff/marketing/calendar" },
      { label: "Ambassador Tracker", icon: Star, href: "/portal/staff/marketing/ambassadors" },
    ],
    IT: [
      { label: "Access Control", icon: Key, href: "/portal/staff/it/access" },
      { label: "IT Tickets", icon: Server, href: "/portal/staff/tickets" },
      { label: "System Health", icon: Activity, href: "/portal/staff/it/health" },
    ],
  };

  const filteredTickets = data.tickets.filter(t => 
    (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAnnouncements = data.announcements.filter(a => 
    (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.body || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Staff Portal</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="max-w-xs w-full">
          <input 
            type="text" 
            placeholder="Search tasks, tickets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-secondary)] dark:bg-white/5 text-xs outline-none focus:border-[var(--gold)] transition-all"
          />
        </div>
      </div>

      {/* Dept Strip */}
      <div className="flex flex-wrap items-center gap-6 p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Department</p>
          <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${DEPT_CONFIG[dept]?.bg || 'bg-gray-100'} ${DEPT_CONFIG[dept]?.text || 'text-gray-700'}`}>
            {DEPT_CONFIG[dept]?.label || "General Staff"}
          </span>
        </div>
        <div className="w-px h-10 bg-[var(--border-subtle)] hidden md:block"></div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Access Level</p>
          <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${role === 'supervisor' ? 'bg-[var(--gold)] text-black' : 'bg-white dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border-subtle)]'}`}>
            {role === 'supervisor' ? 'Supervisor' : 'Member'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Tickets", val: data.tickets.length, sub: "Pending action", icon: Inbox, color: "bg-blue-100 text-blue-600" },
          { label: "Announcements", val: data.announcements.length, sub: "Unread", icon: Megaphone, color: "bg-amber-100 text-amber-600" },
          { label: "Open Tasks", val: 3, sub: "Personal queue", icon: ClipboardList, color: "bg-red-100 text-red-600" },
          { label: "Streak", val: 12, sub: "Days active", icon: Flame, color: "bg-emerald-100 text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="p-5 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl shadow-sm flex gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{s.label}</p>
              <p className="text-[8px] text-[var(--text-muted)] font-medium mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {DEPT_ACTIONS[dept]?.map((act, i) => (
          <a key={i} href={act.href} className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--gold)] group transition-all">
            <div className="p-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl group-hover:bg-[var(--gold)] group-hover:text-black transition-all">
              <act.icon size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--navy)] dark:group-hover:text-white text-center">{act.label}</span>
          </a>
        )) || (
          <div className="col-span-full py-8 text-center text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-20">
            No department actions configured
          </div>
        )}
        <a href="https://wa.me/919650675507" target="_blank" className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl hover:border-[#25D366] group transition-all">
          <div className="p-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl group-hover:bg-[#25D366] group-hover:text-white transition-all">
            <MessageCircle size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp DC</span>
        </a>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Real Tickets Today */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Ticket size={18} className="text-[var(--gold)]" />
            <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Active Tickets</h2>
          </div>
          <div className="space-y-4">
            {filteredTickets.length > 0 ? filteredTickets.map((t, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-[var(--border-subtle)] rounded-xl group hover:border-[var(--gold)] transition-all">
                <div className={`w-2 h-2 rounded-full ${t.priority === 'HIGH' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>
                <div className="flex-1">
                  <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase line-clamp-1">{t.title}</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest">{t.status} · {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-lg">
                  {t.priority}
                </span>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">No tickets found</p>
              </div>
            )}
          </div>
          <a href="/portal/staff/tickets" className="block w-full mt-6 py-3 text-center border border-dashed border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)] rounded-xl transition-all">
            View All Department Tickets
          </a>
        </div>

        {/* Real Announcements */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone size={18} className="text-[var(--gold)]" />
            <h2 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Announcements</h2>
          </div>
          <div className="space-y-6">
            {filteredAnnouncements.length > 0 ? filteredAnnouncements.map((a, i) => (
              <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-1 before:h-8 before:bg-[var(--gold)]/20 hover:before:bg-[var(--gold)] before:transition-all">
                <p className="text-xs font-black text-[var(--navy)] dark:text-white uppercase">{a.title}</p>
                <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest">
                  {a.priority === 'high' && <span className="text-[var(--gold)] mr-2">● IMPORTANT</span>}
                  {new Date(a.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">No announcements</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Banknote(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

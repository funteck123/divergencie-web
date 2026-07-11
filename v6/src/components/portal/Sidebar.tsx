"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  User as UserIcon,
  Calendar, 
  BookOpen, 
  Video, 
  TrendingUp, 
  Settings, 
  LogOut,
  Ticket,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  ClipboardCheck,
  Upload as UploadIcon,
  Calculator,
  Inbox,
  Database,
  ShieldCheck,
  X,
  Cpu,
  HelpCircle,
  Megaphone
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

const MENU_ITEMS: Record<string, any[]> = {
  student: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/student" },
    { label: "Profile", icon: UserIcon, href: "/portal/student/profile" },
    { label: "Live Classes", icon: Video, href: "/portal/student/classes" },
    { label: "Assignments", icon: BookOpen, href: "/portal/student/assignments" },
    { label: "Recordings", icon: FileText, href: "/portal/student/recordings" },
    { label: "Progress", icon: TrendingUp, href: "/portal/student/progress" },
    { label: "Curriculum", icon: BookOpen, href: "/portal/student/curriculum" },
    { label: "Support", icon: MessageSquare, href: "/portal/student/support" },
  ],
  teacher: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/teacher" },
    { label: "Profile", icon: UserIcon, href: "/portal/teacher/profile" },
    { label: "Attendance", icon: ClipboardCheck, href: "/portal/teacher/attendance" },
    { label: "Claims", icon: CreditCard, href: "/portal/teacher/claims" },
    { label: "Student Doubts", icon: HelpCircle, href: "/portal/teacher/doubts" },
    { label: "Support", icon: MessageSquare, href: "/portal/teacher/tickets" },
  ],
  management: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/management" },
    { label: "Profile", icon: UserIcon, href: "/portal/management/profile" },
    { label: "Metrics", icon: TrendingUp, href: "/portal/management/metrics" },
    { label: "Access Matrix", icon: ShieldCheck, href: "/portal/management/permissions" },
    { label: "Staff Records", icon: FileText, href: "/portal/staff/hr/records" },
    { label: "Tickets", icon: Ticket, href: "/portal/management/tickets" },
    { label: "Database", icon: Database, href: "/portal/management/database" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
    { label: "Budget", icon: CreditCard, href: "/portal/management/budget" },
    { label: "Announcements", icon: Megaphone, href: "/portal/management/announcements" },
  ],
  staff: [], // Dynamic based on dept
  parent: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/parent" },
    { label: "Profile", icon: UserIcon, href: "/portal/parent/profile" },
    { label: "Child Progress", icon: TrendingUp, href: "/portal/parent/progress" },
    { label: "Fees & Payments", icon: CreditCard, href: "/portal/parent/fees" },
    { label: "Support", icon: MessageSquare, href: "/portal/parent/support" },
  ],
  ambassador: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/ambassador" },
    { label: "Profile", icon: UserIcon, href: "/portal/ambassador/profile" },
    { label: "Programme", icon: BookOpen, href: "/portal/ambassador/programme" },
    { label: "Enrolments", icon: ClipboardCheck, href: "/portal/ambassador/enrolments" },
    { label: "Sessions", icon: Video, href: "/portal/ambassador/meetings" },
    { label: "Referrals", icon: Users, href: "/portal/ambassador/referrals" },
    { label: "Commission", icon: CreditCard, href: "/portal/ambassador/claims" },
    { label: "Support", icon: MessageSquare, href: "/portal/ambassador/tickets" },
  ],
  candidate: [
    { label: "Application Home", icon: LayoutDashboard, href: "/portal/candidate" },
    { label: "Profile", icon: UserIcon, href: "/portal/candidate/profile" },
    { label: "Upload Docs", icon: UploadIcon, href: "/portal/candidate" }, 
    { label: "Support", icon: MessageSquare, href: "/portal/candidate/support" },
  ],
};

const STAFF_DEPT_ITEMS: Record<string, any[]> = {
  PR: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/staff" },
    { label: "Schedule Builder", icon: Calendar, href: "/portal/staff/shared/schedule" },
    { label: "Student Mapping", icon: Users, href: "/portal/staff/pr/mapping" },
    { label: "Attendance Logs", icon: ClipboardCheck, href: "/portal/staff/pr/attendance" },
    { label: "PR Tracker", icon: ShieldCheck, href: "/portal/staff/pr/tracker" },
    { label: "Content Bank", icon: FileText, href: "/portal/staff/shared/content-bank" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
    { label: "Tickets", icon: Ticket, href: "/portal/staff/tickets" },
  ],
  Finance: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/staff" },
    { label: "Rate Card Manager", icon: Calculator, href: "/portal/staff/finance/rates" },
    { label: "Invoice Manager", icon: FileText, href: "/portal/staff/finance/invoices" },
    { label: "Claims Queue", icon: CreditCard, href: "/portal/staff/finance/claims" },
    { label: "Tickets", icon: Ticket, href: "/portal/staff/tickets" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
  ],
  HR: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/staff" },
    { label: "Candidates", icon: Users, href: "/portal/staff/hr/candidates" },
    { label: "Staff Records", icon: FileText, href: "/portal/staff/hr/records" },
    { label: "Tickets", icon: Ticket, href: "/portal/staff/tickets" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
  ],
  Marketing: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/staff" },
    { label: "Leads", icon: TrendingUp, href: "/portal/staff/marketing/leads" },
    { label: "Post Calendar", icon: Calendar, href: "/portal/staff/marketing/calendar" },
    { label: "Tickets", icon: Ticket, href: "/portal/staff/tickets" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
  ],
  IT: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/portal/staff" },
    { label: "Ticket Queue", icon: Ticket, href: "/portal/staff/tickets" },
    { label: "Access Control", icon: Settings, href: "/portal/staff/it/access" },
    { label: "IT Roadmap", icon: Cpu, href: "/portal/staff/it/roadmap" },
    { label: "PR Tracker", icon: ShieldCheck, href: "/portal/staff/pr/tracker" },
    { label: "Meetings", icon: Users, href: "/portal/staff/shared/meetings" },
  ],
};

export function Sidebar({ onMobileClose }: { onMobileClose?: () => void }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  if (status === "loading") return null;
  
  const role = (session?.user as any)?.role;
  const dept = (session?.user as any)?.dept;
  
  if (!role || !MENU_ITEMS[role]) return null;

  let items = [...MENU_ITEMS[role]];
  
  if (role === 'staff' && dept && STAFF_DEPT_ITEMS[dept]) {
    items = [...STAFF_DEPT_ITEMS[dept]];
    
    // Restriction: Staff Records only for HR_SUP
    if (dept === 'HR') {
      const subGroup = (session?.user as any)?.subGroup;
      if (subGroup !== 'HR_SUP') {
        items = items.filter(i => i.label !== "Staff Records");
      }
    }
  }

  // Always add Profile for everyone
  if (!items.find(i => i.label === "Profile")) {
    items.splice(1, 0, { label: "Profile", icon: UserIcon, href: `/portal/${role}/profile` });
  }

  return (
    <aside className={`w-64 bg-[var(--navy)] text-white flex flex-col h-screen ${onMobileClose ? '' : 'fixed hidden md:flex'} left-0 top-0 z-50`}>
      <div className="p-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/assets/images/logo.jpg" alt="Logo" width={32} height={32} className="w-8 h-8 object-cover rounded" />
          <span className="font-black text-lg tracking-tight">Divergen<span className="text-[var(--gold)]">CIE</span></span>
        </Link>
        {onMobileClose && (
          <button onClick={onMobileClose} className="md:hidden p-2 hover:bg-white/10 rounded-full">
            <X size={20} className="text-white/60" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-3 rounded-r-lg text-sm font-bold transition-all group border-l-4 ${
                isActive 
                  ? "border-[var(--gold)] text-[var(--gold)] bg-[var(--gold-light-bg)] dark:bg-white/5" 
                  : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-[var(--gold)]" : "text-white/40 group-hover:text-white group-hover:scale-110 transition-transform"} />
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => {
            signOut();
            onMobileClose?.();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <LogOut size={18} className="text-[var(--gold)]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

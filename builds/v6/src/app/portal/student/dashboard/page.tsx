import { Trophy, Target, Clock, Calendar, ChevronRight, ArrowUpRight, Star, Zap, BookOpen, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import Link from "next/link";

async function getDashboardData(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      attendances: { include: { session: true }, orderBy: { markedAt: 'desc' }, take: 20 },
      mockResults: { orderBy: { createdAt: 'desc' }, take: 1 },
      progress: { include: { syllabusItem: true } },
      studentSessions: {
        where: { startTime: { gte: new Date() }, status: 'scheduled' },
        orderBy: { startTime: 'asc' },
        take: 1,
        include: { teacher: { select: { name: true } } }
      },
      assignments: { where: { status: 'pending' }, orderBy: { dueDate: 'asc' }, take: 3 }
    }
  } as any);

  if (!user) return null;

  const sessions = (user as any).attendances.length;
  const avgScore = (user as any).mockResults[0]?.score ?? null;
  const totalItems = (user as any).progress.length;
  const doneItems = (user as any).progress.filter((p: any) => p.completed).length;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const nextSession = (user as any).studentSessions[0];
  const pending = (user as any).assignments;

  return { sessions, avgScore, pct, doneItems, totalItems, nextSession, pending, name: user.name };
}

export default async function StudentDashboard() {
  const session = await auth();
  const email = session?.user?.email;
  const data = email ? await getDashboardData(email) : null;
  const userName = data?.name ?? session?.user?.name ?? "Student";

  const nextTime = data?.nextSession
    ? new Date(data.nextSession.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const nextSub = data?.nextSession?.subject ?? null;

  const stats = [
    { label: "Sessions Attended", value: data?.sessions?.toString() ?? "—", sub: "Total logged", icon: Target, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
    { label: "Latest Mock", value: data?.avgScore != null ? `${data.avgScore}%` : "—", sub: data?.avgScore != null ? (data.avgScore >= 80 ? "A* Level" : data.avgScore >= 65 ? "On Track" : "Needs Focus") : "No mock yet", icon: Trophy, color: "text-[var(--gold)]", bg: "bg-amber-50 dark:bg-amber-900/10" },
    { label: "Next Session", value: nextTime ?? "None", sub: nextSub ? `${nextSub} · ${data?.nextSession?.teacher?.name ?? ""}` : "No upcoming session", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" }
  ];

  const focusSubject = data?.nextSession?.subject ?? "your weakest chapter";
  const sessionsToGoal = Math.max(0, 32 - (data?.sessions ?? 0));

  return (
    <div className="space-y-10 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[var(--navy)] rounded-3xl p-10 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,white_0,white_1px,transparent_0,transparent_50%)] bg-[length:20px_20px]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-[var(--gold)] text-black text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
              <Star size={10} fill="currentColor" /> Active Scholar
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">A* Track Protocol v2.1</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight italic mb-2">
            Welcome Back, <span className="text-[var(--gold)]">{userName.split(" ")[0]}</span>
          </h1>
          <p className="text-white/60 font-medium max-w-lg leading-relaxed">
            {sessionsToGoal > 0
              ? `You are ${sessionsToGoal} sessions away from your monthly goal.`
              : "You've hit your monthly session goal — excellent!"}
            {" "}Your focus this week:{" "}
            <span className="text-white font-black underline decoration-[var(--gold)] underline-offset-4">{focusSubject}.</span>
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/portal/student/curriculum" className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
              <BookOpen size={14} /> View Curriculum
            </Link>
            <Link href="/portal/student/classes" className="px-6 py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Calendar size={14} /> My Schedule
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm hover:border-[var(--gold)] transition-all group">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <s.icon size={24} className={s.color} />
            </div>
            <p className="text-3xl font-black text-[var(--navy)] dark:text-white">{s.value}</p>
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
            <p className="text-[9px] font-bold text-[var(--text-muted)] italic mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Curriculum progress bar */}
      {data && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Curriculum Mastery</h3>
            <span className="text-[var(--gold)] font-black text-sm">{data.pct}%</span>
          </div>
          <div className="h-3 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--gold)] rounded-full transition-all duration-1000" style={{ width: `${data.pct}%` }}></div>
          </div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-3">{data.doneItems} of {data.totalItems} chapters complete</p>
        </div>
      )}

      {/* Pending assignments */}
      {data && data.pending.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-[var(--gold)]" /> Pending Assignments
            </h3>
            <Link href="/portal/student/assignments" className="text-[10px] font-black text-[var(--gold)] uppercase hover:underline flex items-center gap-1">
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.pending.map((a: any) => {
              const daysLeft = Math.floor((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-[10px] font-black text-[var(--navy)] dark:text-white uppercase">{a.title}</p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-0.5">{a.subject}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${daysLeft < 0 ? "bg-red-100 text-red-700" : daysLeft <= 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due Today" : `${daysLeft}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
        <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Zap size={16} className="text-[var(--gold)]" /> Quick Access
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Schedule", icon: Calendar, href: "/portal/student/classes" },
            { label: "Curriculum", icon: BookOpen, href: "/portal/student/curriculum" },
            { label: "Recordings", icon: CheckCircle2, href: "/portal/student/recordings" },
            { label: "Progress", icon: Trophy, href: "/portal/student/progress" },
          ].map((l, i) => (
            <Link key={i} href={l.href} className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl hover:border-[var(--gold)] transition-all flex flex-col items-center gap-2 group">
              <l.icon size={20} className="text-[var(--gold)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--navy)] dark:group-hover:text-white">{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

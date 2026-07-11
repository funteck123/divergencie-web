"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getStaffProfile, getStaffEnrolments } from "@/lib/actions/staffEnrolments";
import { User, Briefcase, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  TRIAL: "bg-sky-100 text-sky-700",
  WAITING_CONFIRMATION: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-purple-100 text-purple-700",
};

export default function StaffProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [profile, setProfile] = useState<any>(null);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([getStaffProfile(user.id), getStaffEnrolments(user.id)])
      .then(([prof, enr]) => { setProfile(prof); setEnrolments(enr); })
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-secondary)] dark:bg-white/5" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Your Profile</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Staff Profile</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{user?.email}</p>
      </div>

      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-[var(--gold)]" />
          <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">Identity</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Name", val: user?.name || "—" },
            { label: "Email", val: user?.email || "—" },
            { label: "Role Title", val: profile?.roleTitle || "—" },
            { label: "Department", val: profile?.dept?.name || user?.dept || "—" },
            { label: "Staff Role", val: profile?.staffRole?.name || "—" },
            { label: "Salary Type", val: profile?.salaryType || "—" },
            { label: "Salary Rate", val: profile?.salaryRate ? `£${profile.salaryRate}/hr` : "—" },
            { label: "Supervisor", val: profile?.isSupervisor ? "Yes" : "No" },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">{label}</p>
              <p className="font-semibold text-[var(--navy)] dark:text-white">{val}</p>
            </div>
          ))}
          {profile?.registrationDate && (
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">Registered</p>
              <p className="font-semibold text-[var(--navy)] dark:text-white">{new Date(profile.registrationDate).toLocaleDateString("en-GB")}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">Status</p>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[profile?.status] ?? "bg-gray-100 text-gray-600"}`}>
              {profile?.status || "ACTIVE"}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={16} className="text-[var(--gold)]" />
          <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">Enrolments</span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{enrolments.length} list{enrolments.length !== 1 ? "s" : ""}</span>
        </div>
        {enrolments.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
            <p className="text-[var(--text-muted)] text-sm">No enrolments on record.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrolments.map((list: any) => (
              <div key={list.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-between">
                  <span className="font-black text-xs text-[var(--navy)] dark:text-white uppercase tracking-widest">{list.serviceType}</span>
                  <span className={`text-xs font-bold ${list.isActive ? "text-emerald-600" : "text-gray-400"}`}>{list.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {list.items.length === 0 && <p className="px-5 py-3 text-sm text-[var(--text-muted)]">No items.</p>}
                  {list.items.map((item: any) => (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}>{item.status}</span>
                            {item.expectedHoursPerMonth && <span className="text-xs text-[var(--text-muted)]">{item.expectedHoursPerMonth}h/mo</span>}
                          </div>
                          {item.startDate && <p className="text-xs text-[var(--text-muted)] mt-0.5">From {new Date(item.startDate).toLocaleDateString("en-GB")}</p>}
                        </div>
                        {item.history?.length > 0 && (
                          <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            className="text-xs text-[var(--gold)] font-bold flex items-center gap-1">
                            History {expanded === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>
                      {expanded === item.id && (
                        <div className="mt-3 ml-3 border-l-2 border-[var(--gold)]/30 pl-3 space-y-1.5">
                          {item.history.map((h: any) => (
                            <div key={h.id} className="text-xs text-[var(--text-muted)]">
                              <span className="font-semibold text-[var(--navy)] dark:text-white">{h.fromStatus} → {h.toStatus}</span>
                              <span className="ml-2">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                              {h.reason && <span className="ml-2 italic">"{h.reason}"</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

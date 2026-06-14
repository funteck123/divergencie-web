"use client";

import { useState, useEffect } from "react";
import { ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getAmbassadorEnrolments } from "@/lib/actions/ambassador";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function AmbassadorEnrolmentsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getAmbassadorEnrolments(user.id).then(data => {
      setEnrolments(data ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  const allItems = enrolments.flatMap(l => l.items ?? []);
  const activeCount = allItems.filter(i => i.status === "ACTIVE").length;
  const completedCount = allItems.filter(i => i.status === "COMPLETED").length;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">My Enrolments</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Services", value: allItems.length },
          { label: "Active", value: activeCount },
          { label: "Completed", value: completedCount },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center">
          <ClipboardCheck size={32} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
          <p className="text-[var(--text-muted)] text-sm">No enrolments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrolments.map((list: any) => (
            <div key={list.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{list.serviceType}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{list.items?.length ?? 0} service items</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${list.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {list.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {list.items?.map((item: any) => (
                  <div key={item.id} className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-black text-xs text-[var(--navy)] dark:text-white uppercase tracking-widest">
                          {item.ambassadorService?.title ?? "—"}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.ambassadorService?.serviceType}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-[var(--text-muted)] mb-3">
                      {item.startDate && <span>Start: <strong>{new Date(item.startDate).toLocaleDateString("en-GB")}</strong></span>}
                      {item.endDate && <span>End: <strong>{new Date(item.endDate).toLocaleDateString("en-GB")}</strong></span>}
                      {item.activatedAt && <span>Activated: <strong>{new Date(item.activatedAt).toLocaleDateString("en-GB")}</strong></span>}
                      {item.ambassadorService?.rate && (
                        <span>Rate: <strong>{item.ambassadorService.currency ?? "MYR"} {item.ambassadorService.rate}</strong></span>
                      )}
                      {item.trialRequired && <span className="col-span-2 text-amber-600 font-bold">Trial required</span>}
                    </div>

                    {item.cancellationReason && (
                      <p className="text-[11px] text-red-500 mb-3">Cancellation reason: {item.cancellationReason}</p>
                    )}

                    {item.history?.length > 0 && (
                      <div>
                        <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                          {expanded === item.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          Status History ({item.history.length})
                        </button>
                        {expanded === item.id && (
                          <div className="mt-2 space-y-2 pl-4 border-l-2 border-[var(--gold)]/30">
                            {item.history.map((h: any) => (
                              <div key={h.id} className="text-[11px]">
                                <span className="text-[var(--text-muted)]">
                                  <span className="font-bold text-[var(--navy)] dark:text-white">{h.fromStatus}</span>
                                  {" → "}
                                  <span className="font-bold text-[var(--navy)] dark:text-white">{h.toStatus}</span>
                                  <span className="ml-2 opacity-60">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                                  {h.reason && <span className="ml-2 italic">— "{h.reason}"</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
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
  );
}

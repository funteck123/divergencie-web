"use client";

import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronUp, Loader2, Calendar, List } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getAmbassadorProgramme } from "@/lib/actions/ambassador";

const COMPLETION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-500",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  LOCKED: "bg-gray-100 text-gray-400",
};

export default function AmbassadorProgrammePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "content" | "timeline">>({});

  useEffect(() => {
    if (!user?.id) return;
    getAmbassadorProgramme(user.id).then(data => {
      setServices(data ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Programme</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Your ambassador programme content and timeline.</p>
      </div>

      {services.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center">
          <BookOpen size={32} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
          <p className="text-[var(--text-muted)] text-sm">No programme content available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((svc: any) => {
            const progList = svc.programmeList;
            if (!progList) return null;
            const isOpen = expanded === svc.id;
            const tab = activeTab[svc.id] ?? "content";
            const contentLists: any[] = progList.contentLists ?? [];
            const timelineLists: any[] = progList.timelineLists ?? [];

            return (
              <div key={svc.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : svc.id)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-[var(--gold)]" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{svc.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{svc.serviceType} · {contentLists.length} content lists · {timelineLists.length} timeline lists</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border-subtle)]">
                    {/* Tab switcher */}
                    <div className="flex border-b border-[var(--border-subtle)]">
                      {(["content", "timeline"] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(prev => ({ ...prev, [svc.id]: t }))}
                          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                            tab === t ? "border-b-2 border-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                          }`}>
                          {t === "content" ? <List size={11} /> : <Calendar size={11} />}
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="p-5 space-y-4">
                      {tab === "content" && (
                        contentLists.length === 0 ? (
                          <p className="text-[var(--text-muted)] text-sm text-center py-4">No content lists.</p>
                        ) : contentLists.map((cl: any) => (
                          <div key={cl.id} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{cl.name ?? cl.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${COMPLETION_COLORS[cl.status ?? "NOT_STARTED"] ?? "bg-slate-100 text-slate-500"}`}>
                                {cl.status ?? "ACTIVE"}
                              </span>
                            </div>
                            <div className="divide-y divide-[var(--border-subtle)]">
                              {cl.items?.length === 0 ? (
                                <p className="px-4 py-3 text-xs text-[var(--text-muted)]">No items.</p>
                              ) : cl.items?.map((item: any) => (
                                <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                                  <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center border-[var(--border-subtle)]`}>
                                    {(item.progressList?.length ?? 0) > 0 && item.progressList[0]?.status === "COMPLETED" && <span className="text-[var(--gold)] text-[8px] font-black">✓</span>}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-[var(--navy)] dark:text-white">{item.programmeTitle}</p>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.programmeCode} · Level {item.level}</p>
                                    {item.note && <p className="text-[11px] text-[var(--text-muted)] italic mt-0.5">{item.note}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}

                      {tab === "timeline" && (
                        timelineLists.length === 0 ? (
                          <p className="text-[var(--text-muted)] text-sm text-center py-4">No timeline lists.</p>
                        ) : timelineLists.map((tl: any) => (
                          <div key={tl.id} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{tl.name ?? tl.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${COMPLETION_COLORS[tl.status ?? "NOT_STARTED"] ?? "bg-slate-100 text-slate-500"}`}>
                                {tl.status ?? "NOT STARTED"}
                              </span>
                            </div>
                            <div className="p-4 space-y-3">
                              {tl.items?.map((item: any, idx: number) => (
                                <div key={item.id} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-black
                                      ${item.completedAt ? "bg-[var(--gold)] border-[var(--gold)] text-black" : "border-[var(--border-subtle)] text-[var(--text-muted)]"}`}>
                                      {idx + 1}
                                    </div>
                                    {idx < (tl.items?.length ?? 0) - 1 && <div className="w-0.5 h-6 bg-[var(--border-subtle)] mt-1" />}
                                  </div>
                                  <div className="pb-3">
                                    <p className="text-xs font-bold text-[var(--navy)] dark:text-white">{item.itemType}</p>
                                    <p className="text-[11px] text-[var(--text-muted)]">Month {item.month} · Week {item.weekNumber}</p>
                                    {item.notes && <p className="text-[11px] text-[var(--text-muted)] italic mt-0.5">{item.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

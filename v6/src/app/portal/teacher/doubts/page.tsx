"use client";

import { useState, useEffect } from "react";
import { HelpCircle, CheckCircle2, Send, ChevronDown, Loader2, BookOpen } from "lucide-react";
import { getDoubts, respondToDoubt } from "@/lib/actions/doubts";
import { useSession } from "@/lib/auth-client";

export default function TeacherDoubtsPage() {
  const { data: session } = useSession();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const all = await getDoubts();
    setDoubts(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReply = async (id: string) => {
    if (!reply[id]?.trim()) return;
    setSaving(id);
    await respondToDoubt(id, reply[id]);
    setReply(r => ({ ...r, [id]: "" }));
    setExpanded(null);
    await load();
    setSaving(null);
  };

  const filtered = doubts.filter(d => filter === "all" || d.status === filter);
  const pendingCount = doubts.filter(d => d.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Student Doubts</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">
          {pendingCount > 0 ? `${pendingCount} pending doubt${pendingCount > 1 ? 's' : ''} awaiting your reply.` : "All doubts resolved — great work."}
        </p>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {([["pending", `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`], ["resolved", "Resolved"], ["all", "All"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
          <HelpCircle size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
          <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">
            {filter === "pending" ? "No pending doubts — students haven't asked anything yet." : "No doubts in this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((d: any) => {
            const isOpen = expanded === d.id;
            const isPending = d.status === "pending";
            return (
              <div key={d.id} className={`bg-white dark:bg-white/5 border rounded-2xl shadow-sm overflow-hidden transition-all ${isPending ? "border-amber-200 dark:border-amber-900/40" : "border-[var(--border-subtle)]"}`}>
                <button className="w-full p-6 flex items-start justify-between gap-4 text-left hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : d.id)}>
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPending ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {isPending ? <HelpCircle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{d.student?.name ?? "Unknown Student"}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isPending ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{d.status}</span>
                        <span className="text-[9px] font-bold text-[var(--gold)] uppercase flex items-center gap-1"><BookOpen size={10} />{d.syllabusItem?.subject ?? "—"} · Ch. {d.syllabusItem?.chapterNum ?? "?"}</span>
                      </div>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] leading-relaxed">{d.body}</p>
                      {d.response && !isOpen && (
                        <p className="text-[9px] font-bold text-emerald-600 mt-2 italic">✓ Replied: "{d.response.slice(0, 80)}{d.response.length > 80 ? '…' : ''}"</p>
                      )}
                      <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mt-2">{new Date(d.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-[var(--text-muted)] shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 border-t border-[var(--border-subtle)] pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {d.response && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Your Previous Reply</p>
                        <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200 leading-relaxed">{d.response}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        {d.response ? "Update Reply" : "Write Reply"}
                      </label>
                      <textarea
                        rows={3}
                        value={reply[d.id] ?? ""}
                        onChange={e => setReply(r => ({ ...r, [d.id]: e.target.value }))}
                        placeholder="Explain clearly — the student sees this immediately on their curriculum page..."
                        className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]"
                      />
                      <button
                        onClick={() => handleReply(d.id)}
                        disabled={saving === d.id || !reply[d.id]?.trim()}
                        className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-40">
                        {saving === d.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {d.response ? "Update Reply" : "Send Reply"}
                      </button>
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

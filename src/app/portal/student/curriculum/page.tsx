"use client";

import { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, ChevronDown, HelpCircle, Plus, Search, Loader2 } from "lucide-react";
import { logDoubt, getStudentDoubts } from "@/lib/actions/doubts";
import { getSyllabusItems, getStudentProgress, toggleChapterComplete } from "@/lib/actions/progress";
import { MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";

const MILESTONE_COLORS: Record<string, string> = {
  core: "bg-blue-100 text-blue-700",
  "a*": "bg-amber-100 text-amber-700",
  topper: "bg-purple-100 text-purple-700",
};
const SUBJECT_COLORS = ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-emerald-500", "bg-rose-500"];

export default function StudentCurriculumPage() {
  const { data: session } = useSession();
  const [activeSubject, setActiveSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [openChapters, setOpenChapters] = useState<string[]>([]);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myDoubts, setMyDoubts] = useState<any[]>([]);
  const [showDoubtsPanel, setShowDoubtsPanel] = useState(false);

  const loadData = async (subject: string) => {
    if (!session?.user?.email) return;
    setLoading(true);
    const [items, progress, doubts] = await Promise.all([
      getSyllabusItems(subject),
      getStudentProgress(session.user.email),
      getStudentDoubts(session.user.email)
    ]);
    setMyDoubts(doubts);
    setChapters(items);
    const map: Record<string, boolean> = {};
    for (const p of progress) { map[p.syllabusItemId] = p.completed; }
    setProgressMap(map);
    setLoading(false);
  };

  const loadSubjects = async () => {
    const all = await getSyllabusItems();
    const unique = [...new Set(all.map((i: any) => i.subject))];
    setSubjects(unique);
    if (unique.length > 0 && !activeSubject) {
      setActiveSubject(unique[0]);
      setChapters(all.filter((i: any) => i.subject === unique[0]));
    }
  };

  useEffect(() => { loadSubjects(); }, [session]);
  useEffect(() => { if (activeSubject) loadData(activeSubject); }, [activeSubject, session]);

  const handleToggleComplete = async (itemId: string) => {
    if (!session?.user?.email) return;
    const current = progressMap[itemId] ?? false;
    setProgressMap(m => ({ ...m, [itemId]: !current })); // optimistic
    await toggleChapterComplete(session.user.email, itemId, !current);
  };

  const done = Object.values(progressMap).filter(Boolean).length;
  const total = chapters.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const filtered = chapters.filter(ch =>
    !search || ch.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Interactive Curriculum</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Track your progress through the syllabus and master every topic.</p>
      </div>
      <button onClick={() => setShowDoubtsPanel(p => !p)}
        className="px-5 py-3 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 relative">
        <MessageSquare size={14} /> My Doubts
        {myDoubts.filter((d: any) => d.response).length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">
            {myDoubts.filter((d: any) => d.response).length}
          </span>
        )}
      </button>

      {/* Doubts panel */}
      {showDoubtsPanel && (
        <div className="bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white flex items-center gap-2">
            <MessageSquare size={14} className="text-amber-500" /> Your Doubts & Teacher Replies
          </h3>
          {myDoubts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase">No doubts logged yet — click the question mark icon on any chapter.</p>
          ) : (
            <div className="space-y-3">
              {myDoubts.map((d: any) => (
                <div key={d.id} className={`p-4 rounded-xl border-l-4 ${d.status === "resolved" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10" : "border-amber-400 bg-amber-50 dark:bg-amber-900/10"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--gold)]">{d.syllabusItem?.subject} · Ch.{d.syllabusItem?.chapterNum}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${d.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--navy)] dark:text-white mb-2">{d.body}</p>
                  {d.response ? (
                    <div className="mt-2 p-3 bg-white dark:bg-white/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Teacher Reply</p>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] leading-relaxed">{d.response}</p>
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-amber-600 uppercase italic mt-1">⏳ Awaiting teacher reply…</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress ring */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="12" className="text-[var(--bg-secondary)] dark:text-white/5" />
            <circle cx="64" cy="64" r="58" fill="none" stroke="var(--gold)" strokeWidth="12" strokeDasharray="364" strokeDashoffset={364 - (364 * pct) / 100} strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <span className="absolute text-2xl font-black text-[var(--navy)] dark:text-white">{pct}%</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-2">Mastery: {activeSubject}</h3>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed mb-4">
            Completed <span className="text-[var(--gold)]">{done} of {total}</span> chapters.
          </p>
          <div className="flex gap-4">
            {[["core","bg-blue-500"],["a*","bg-amber-500"],["topper","bg-purple-500"]].map(([m,c]) => (
              <div key={m} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${c}`}></div>
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Subject sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {subjects.map((s, i) => (
            <button key={s} onClick={() => setActiveSubject(s)}
              className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group ${activeSubject === s ? "bg-[var(--navy)] text-white shadow-lg" : "bg-white dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--gold)]"}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
              <BookOpen size={16} className={activeSubject === s ? "text-[var(--gold)]" : "text-[var(--border-subtle)] group-hover:text-[var(--gold)]"} />
            </button>
          ))}
          {subjects.length === 0 && !loading && (
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase p-4">No syllabus items — management needs to seed them</p>
          )}
        </div>

        {/* Chapter list */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-[var(--gold)]" /> Syllabus Breakdown
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find chapter..." className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-[10px] font-bold outline-none focus:border-[var(--gold)] w-48" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
              No chapters for this subject yet
            </div>
          ) : (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm divide-y divide-[var(--border-subtle)]">
              {filtered.map((ch: any, i: number) => {
                const isDone = progressMap[ch.id] ?? false;
                const isOpen = openChapters.includes(ch.id);
                const colorIdx = i % SUBJECT_COLORS.length;
                return (
                  <div key={ch.id} className="group">
                    <div className="p-6 flex items-center gap-6 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setOpenChapters(p => p.includes(ch.id) ? p.filter(x => x !== ch.id) : [...p, ch.id])}>
                      <button onClick={e => { e.stopPropagation(); handleToggleComplete(ch.id); }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-subtle)] group-hover:border-[var(--gold)]'}`}>
                        {isDone && <CheckCircle2 size={14} />}
                      </button>
                      <div className={`w-10 h-10 rounded-full ${SUBJECT_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg`}>
                        {ch.chapterNum}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-black uppercase tracking-tight transition-all ${isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--navy)] dark:text-white'}`}>{ch.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${MILESTONE_COLORS[ch.milestone?.toLowerCase()] ?? "bg-gray-100 text-gray-700"}`}>{ch.milestone}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={e => { e.stopPropagation(); setSelectedChapter(ch); setShowDoubtModal(true); }}
                          className="p-2 text-[var(--text-muted)] hover:text-amber-500 transition-colors flex items-center gap-1">
                          <HelpCircle size={16} />
                          <span className="text-[8px] font-black uppercase">Doubt</span>
                        </button>
                        <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showDoubtModal && selectedChapter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#121212] border border-[var(--border-subtle)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[var(--border-subtle)]">
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Log a Doubt</h2>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Chapter {selectedChapter.chapterNum}: {selectedChapter.title}</p>
            </div>
            <form action={async (formData) => {
              setSaving(true);
              try {
                await logDoubt(formData);
                setShowDoubtModal(false);
              } catch (err: any) { alert(err.message); }
              setSaving(false);
            }} className="p-8 space-y-6">
              <input type="hidden" name="studentId" value={session?.user?.email!} />
              <input type="hidden" name="syllabusItemId" value={selectedChapter.id} />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Your Question</label>
                <textarea name="body" required rows={4} placeholder="Describe exactly what you find difficult about this topic..."
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowDoubtModal(false)} className="flex-1 py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Log Doubt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

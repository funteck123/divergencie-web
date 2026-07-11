"use client";

import { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, ChevronDown, HelpCircle, Plus, Search, Loader2, MessageSquare, Video } from "lucide-react";
import { logDoubt, getStudentDoubts } from "@/lib/actions/doubts";
import { getSyllabusItems, getStudentProgress, toggleChapterComplete, getSyllabusChapters } from "@/lib/actions/progress";
import { useSession } from "@/lib/auth-client";

const MILESTONE_COLORS: Record<string, string> = {
  core: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  "a*": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  topper: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
};

const SUBJECT_COLORS = [
  "bg-gradient-to-tr from-blue-500 to-indigo-600",
  "bg-gradient-to-tr from-amber-500 to-orange-600",
  "bg-gradient-to-tr from-purple-500 to-pink-600",
  "bg-gradient-to-tr from-emerald-500 to-teal-600",
  "bg-gradient-to-tr from-rose-500 to-red-600"
];

export default function StudentCurriculumPage() {
  const { data: session } = useSession();
  const [activeSubject, setActiveSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [openChapters, setOpenChapters] = useState<string[]>([]);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [selectedSyllabusItem, setSelectedSyllabusItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myDoubts, setMyDoubts] = useState<any[]>([]);
  const [showDoubtsPanel, setShowDoubtsPanel] = useState(false);
  const [chapterTab, setChapterTab] = useState<Record<string, "checklist" | "recordings">>({});

  const loadData = async (subject: string) => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const [chaps, progress, doubts] = await Promise.all([
        getSyllabusChapters(subject),
        getStudentProgress(session.user.email),
        getStudentDoubts(session.user.email)
      ]);
      setMyDoubts(doubts);
      setChapters(chaps);
      const map: Record<string, boolean> = {};
      for (const p of progress) {
        map[p.syllabusItemId] = p.completed;
      }
      setProgressMap(map);
    } catch (err) {
      console.error("Error loading curriculum details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const all = await getSyllabusItems();
      const unique = [...new Set(all.map((i: any) => i.subject).filter(Boolean) as string[])];
      setSubjects(unique);
      if (unique.length > 0 && !activeSubject) {
        setActiveSubject(unique[0]);
      } else if (unique.length === 0) {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadSubjects();
    }
  }, [session]);

  useEffect(() => {
    if (activeSubject && session?.user?.email) {
      loadData(activeSubject);
    }
  }, [activeSubject, session]);

  const handleToggleComplete = async (itemId: string) => {
    if (!session?.user?.email) return;
    const current = progressMap[itemId] ?? false;
    setProgressMap(m => ({ ...m, [itemId]: !current })); // optimistic update
    try {
      await toggleChapterComplete(session.user.email, itemId, !current);
    } catch (err) {
      // rollback on error
      setProgressMap(m => ({ ...m, [itemId]: current }));
      console.error("Failed to toggle completion status:", err);
    }
  };

  const syllabusItems = chapters.flatMap(ch => ch.syllabusItems || []);
  const done = syllabusItems.filter(item => progressMap[item.id]).length;
  const total = syllabusItems.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const filtered = chapters.filter(ch => {
    if (!search) return true;
    const s = search.toLowerCase();
    const matchChapter = ch.chapterTitle.toLowerCase().includes(s) || ch.chapterNum.toLowerCase().includes(s);
    const matchItems = ch.syllabusItems?.some((item: any) =>
      item.topicTitle.toLowerCase().includes(s) ||
      (item.topicCode && item.topicCode.toLowerCase().includes(s))
    );
    return matchChapter || matchItems;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">
            Interactive Curriculum
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Track your progress through chapters, view curated recordings, and log doubts.
          </p>
        </div>

        <button
          onClick={() => setShowDoubtsPanel(p => !p)}
          className="px-5 py-3 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 relative border border-amber-200/40"
        >
          <MessageSquare size={14} /> My Doubts
          {myDoubts.filter((d: any) => d.status === "open").length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
              {myDoubts.filter((d: any) => d.status === "open").length}
            </span>
          )}
        </button>
      </div>

      {/* Doubts panel */}
      {showDoubtsPanel && (
        <div className="bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white flex items-center gap-2">
            <MessageSquare size={14} className="text-amber-500" /> Your Doubts & Teacher Replies
          </h3>
          {myDoubts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase py-2">
              No doubts logged yet — click the "doubt" button next to any topic.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {myDoubts.map((d: any) => {
                const isResolved = d.status === "resolved";
                const item = d.syllabusItem;
                const chapter = item?.syllabusChapter;
                return (
                  <div 
                    key={d.id} 
                    className={`p-4 rounded-xl border-l-4 ${isResolved ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--gold)]">
                        {item?.subject} · {chapter ? `Ch.${chapter.chapterNum}` : "General"} · {item?.topicCode || ""}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isResolved ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[var(--navy)] dark:text-white mb-2">{d.body}</p>
                    {d.response ? (
                      <div className="mt-2 p-3 bg-white dark:bg-white/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                        <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Teacher Reply</p>
                        <p className="text-[10px] font-medium text-[var(--text-muted)] dark:text-gray-300 leading-relaxed">{d.response}</p>
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase italic mt-1">⏳ Awaiting teacher reply…</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Progress Card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="12" className="text-[var(--bg-secondary)] dark:text-white/5" />
            <circle cx="64" cy="64" r="58" fill="none" stroke="var(--gold)" strokeWidth="12" strokeDasharray="364" strokeDashoffset={364 - (364 * pct) / 100} strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <span className="absolute text-2xl font-black text-[var(--navy)] dark:text-white">{pct}%</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-2">Subject Mastery</h3>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Completed <span className="text-[var(--gold)] font-black">{done} of {total}</span> topics in <span className="text-[var(--navy)] dark:text-white font-black">{activeSubject}</span>.
          </p>
          <div className="flex gap-4">
            {Object.entries(MILESTONE_COLORS).map(([m, c]) => (
              <div key={m} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${c}`}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Subject sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {subjects.map((s, i) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group ${activeSubject === s ? "bg-[var(--navy)] text-white shadow-lg scale-[1.02]" : "bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 text-[var(--text-muted)] dark:text-gray-400 hover:border-[var(--gold)]"}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
              <BookOpen size={16} className={activeSubject === s ? "text-[var(--gold)]" : "text-[var(--border-subtle)] dark:text-white/20 group-hover:text-[var(--gold)]"} />
            </button>
          ))}
          {subjects.length === 0 && !loading && (
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase p-4">No subjects available</p>
          )}
        </div>

        {/* Chapter list */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <h3 className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-[var(--gold)]" /> Syllabus Chapters
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chapter or topic..."
                className="pl-10 pr-4 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] w-full transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-[var(--gold)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
              No chapters match your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((ch: any, i: number) => {
                const isOpen = openChapters.includes(ch.id);
                const colorIdx = i % SUBJECT_COLORS.length;
                const items = ch.syllabusItems || [];
                const completedCount = items.filter((item: any) => progressMap[item.id]).length;
                const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
                const recordings = ch.recordingList?.items || [];
                const activeTab = chapterTab[ch.id] || "checklist";

                return (
                  <div 
                    key={ch.id} 
                    className="border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl overflow-hidden bg-white dark:bg-white/5 transition-all shadow-sm duration-300"
                  >
                    {/* Chapter Accordion Header */}
                    <div 
                      onClick={() => setOpenChapters(p => p.includes(ch.id) ? p.filter(x => x !== ch.id) : [...p, ch.id])}
                      className="p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 rounded-2xl ${SUBJECT_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md`}>
                          {ch.chapterNum}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-[var(--navy)] dark:text-white">
                            {ch.chapterTitle}
                          </h4>
                          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                              {items.length} {items.length === 1 ? 'Topic' : 'Topics'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)] dark:bg-white/10"></span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${progressPct === 100 ? "text-emerald-500" : "text-amber-500"}`}>
                              {progressPct}% Mastered
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {recordings.length > 0 && (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                            <Video size={10} /> {recordings.length}
                          </span>
                        )}
                        <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Chapter Accordion Content */}
                    {isOpen && (
                      <div className="border-t border-[var(--border-subtle)] dark:border-white/10 p-6 bg-[var(--bg-secondary)]/30 dark:bg-black/10 space-y-4">
                        {/* Tab Selector */}
                        <div className="flex gap-2 border-b border-[var(--border-subtle)] dark:border-white/10 pb-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setChapterTab(prev => ({ ...prev, [ch.id]: "checklist" })); }}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "checklist" ? "bg-[var(--navy)] text-white shadow-sm" : "bg-white dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
                          >
                            Syllabus Checklist
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setChapterTab(prev => ({ ...prev, [ch.id]: "recordings" })); }}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === "recordings" ? "bg-[var(--navy)] text-white shadow-sm" : "bg-white dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
                          >
                            Curated Videos
                            {recordings.length > 0 && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${activeTab === "recordings" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                {recordings.length}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === "checklist" ? (
                          <div className="space-y-2">
                            {items.length === 0 ? (
                              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider py-4">No topics defined for this chapter.</p>
                            ) : (
                              items.map((item: any) => {
                                const isDone = progressMap[item.id] ?? false;
                                return (
                                  <div 
                                    key={item.id} 
                                    className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl hover:border-[var(--gold)] transition-colors group/item"
                                  >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      <button 
                                        onClick={() => handleToggleComplete(item.id)}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-subtle)] hover:border-[var(--gold)] dark:border-white/20'}`}
                                      >
                                        {isDone && <CheckCircle2 size={14} />}
                                      </button>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {item.topicCode && (
                                            <span className="text-[9px] font-black uppercase text-[var(--gold)] tracking-wider">
                                              {item.topicCode}
                                            </span>
                                          )}
                                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--text-muted)]">
                                            {item.level}
                                          </span>
                                        </div>
                                        <p className={`text-xs font-bold leading-normal mt-1 ${isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--navy)] dark:text-white'}`}>
                                          {item.topicTitle}
                                        </p>
                                      </div>
                                    </div>

                                    <button 
                                      onClick={() => { setSelectedSyllabusItem(item); setShowDoubtModal(true); }}
                                      className="ml-4 p-2.5 text-[var(--text-muted)] hover:text-amber-500 transition-colors flex items-center gap-1.5 bg-[var(--bg-secondary)] dark:bg-white/5 hover:bg-amber-500/5 rounded-xl text-[8px] font-black uppercase tracking-widest border border-transparent hover:border-amber-500/20"
                                    >
                                      <HelpCircle size={14} />
                                      <span>Doubt</span>
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {recordings.length === 0 ? (
                              <div className="py-8 text-center bg-white dark:bg-white/5 border border-dashed border-[var(--border-subtle)] dark:border-white/10 rounded-2xl">
                                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">
                                  No curated video recordings for this chapter yet.
                                </p>
                              </div>
                            ) : (
                              recordings.map((recItem: any) => {
                                const rec = recItem.recording;
                                if (!rec) return null;
                                return (
                                  <div 
                                    key={recItem.id}
                                    className="p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                                          {rec.category || "Session Video"}
                                        </span>
                                        {rec.duration && (
                                          <span className="text-[9px] font-bold text-[var(--text-muted)]">
                                            ⏱️ {rec.duration}
                                          </span>
                                        )}
                                        <span className="text-[9px] font-bold text-[var(--text-muted)]">
                                          📅 {new Date(rec.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                      </div>
                                      <h5 className="text-[11px] font-black uppercase tracking-tight text-[var(--navy)] dark:text-white leading-tight">
                                        {rec.title}
                                      </h5>
                                      {recItem.notes && (
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] dark:text-gray-400 italic">
                                          💡 {recItem.notes}
                                        </p>
                                      )}
                                    </div>

                                    <a
                                      href={rec.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                      Play Video
                                    </a>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Doubt Modal */}
      {showDoubtModal && selectedSyllabusItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#121212] border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[var(--border-subtle)] dark:border-white/10">
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Log a Doubt</h2>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                Topic {selectedSyllabusItem.topicCode || ""}: {selectedSyllabusItem.topicTitle}
              </p>
            </div>
            <form 
              action={async (formData) => {
                setSaving(true);
                try {
                  await logDoubt(formData);
                  setShowDoubtModal(false);
                  // Refresh doubts feed
                  if (session?.user?.email) {
                    const doubts = await getStudentDoubts(session.user.email);
                    setMyDoubts(doubts);
                  }
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setSaving(false);
                }
              }} 
              className="p-8 space-y-6"
            >
              <input type="hidden" name="studentId" value={session?.user?.id || ""} />
              <input type="hidden" name="syllabusItemId" value={selectedSyllabusItem.id} />
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Your Question</label>
                <textarea 
                  name="body" 
                  required 
                  rows={4} 
                  placeholder="Describe exactly what you find difficult or need help with in this topic..."
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowDoubtModal(false)} 
                  className="flex-1 py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Log Doubt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

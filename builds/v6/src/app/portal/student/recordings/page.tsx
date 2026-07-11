"use client";

import { useState, useEffect } from "react";
import { PlayCircle, FileText, Search, Clock, Calendar, User, X, Monitor, Video, Download, Loader2 } from "lucide-react";
import { getRecordings } from "@/lib/actions/progress";

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3b82f6", Chemistry: "var(--gold)", Physics: "#f43f5e",
  Biology: "#a855f7", default: "var(--navy)"
};

export default function StudentRecordingsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const recs = await getRecordings(filter !== "All" ? filter : undefined, search || undefined);
    setRecordings(recs);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Session Recordings</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Review past classes, download lesson notes, and catch up on missed sessions.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto">
          {["All", "Mathematics", "Physics", "Chemistry", "Biology"].map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === cat ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
              {cat}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input type="text" placeholder="Search topic or subject..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full md:w-64 p-4 pl-12 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-xs font-bold outline-none focus:border-[var(--gold)] shadow-sm" />
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : recordings.length === 0 ? (
        <div className="py-24 text-center">
          <Monitor size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
          <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No recordings yet — they appear here after teacher submits attendance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((r: any) => {
            const color = SUBJECT_COLORS[r.subject] ?? SUBJECT_COLORS.default;
            return (
              <div key={r.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm group hover:border-[var(--gold)] transition-all">
                <div className="aspect-video bg-[var(--bg-secondary)] dark:bg-white/5 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }}></div>
                  <button onClick={() => setSelectedVideo(r)} className="w-16 h-16 bg-[var(--gold)] rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform z-10">
                    <PlayCircle size={32} className="text-black ml-1" />
                  </button>
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-widest">{r.duration}</div>
                </div>
                <div className="p-6">
                  <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mb-1">{r.subject}</p>
                  <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-4 group-hover:text-[var(--gold)] transition-colors">{r.title}</h3>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--text-muted)] uppercase mb-6">
                    <Calendar size={12} className="text-[var(--gold)]" />
                    {new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setSelectedVideo(r)} className="py-3 bg-[var(--navy)] dark:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--gold)] hover:text-black transition-all flex items-center justify-center gap-2">
                      <Video size={14} /> Watch
                    </button>
                    <a href={r.videoUrl} target="_blank" rel="noreferrer" className="py-3 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-[var(--gold)] transition-all flex items-center justify-center gap-2">
                      <Download size={14} /> Link
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl relative">
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <X size={20} />
            </button>
            <div className="aspect-video bg-zinc-900 flex flex-col items-center justify-center gap-4 relative">
              {selectedVideo.videoUrl ? (
                <iframe src={selectedVideo.videoUrl} className="w-full h-full" allowFullScreen title={selectedVideo.title} />
              ) : (
                <>
                  <PlayCircle size={64} className="text-[var(--gold)] opacity-40" />
                  <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest px-8 text-center">No video URL — teacher needs to update attendance record</p>
                </>
              )}
            </div>
            <div className="p-8 bg-zinc-950 border-t border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-[0.2em] mb-1">{selectedVideo.subject}</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedVideo.title}</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">
                  Duration: {selectedVideo.duration} · {new Date(selectedVideo.date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <a href={selectedVideo.videoUrl} target="_blank" rel="noreferrer" className="px-8 py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2">
                <FileText size={14} /> Open Recording
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, CheckCircle2, AlertCircle, Clock, Image, Link2, X, Loader2, ExternalLink, Edit3 } from "lucide-react";
import { getMarketingPosts, createMarketingPost, updatePostStatus, getMarketingStats } from "@/lib/actions/marketing";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  posted: "bg-emerald-100 text-emerald-700",
  missed: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-600",
};

const CONTENT_TYPES = ["carousel","reel","post","story","vlog","documentary","alumni story","staff story","literature"];

export default function MarketingCalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ scheduled: 0, posted: 0, missed: 0, ambassadors: 0, leads: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    canvaLink: "", driveLink: "", caption: "", scheduledAt: "",
    contentType: "post", campaignTag: ""
  });

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      getMarketingPosts(statusFilter !== "all" ? statusFilter : undefined),
      getMarketingStats()
    ]);
    setPosts(p);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAdd = async () => {
    if (!form.scheduledAt) { setError("Scheduled date required"); return; }
    setSaving(true);
    try {
      await createMarketingPost({
        ...form,
        scheduledAt: new Date(form.scheduledAt),
        canvaLink: form.canvaLink || undefined,
        driveLink: form.driveLink || undefined,
        caption: form.caption || undefined,
        contentType: form.contentType || undefined,
        campaignTag: form.campaignTag || undefined,
      });
      setShowAdd(false);
      setForm({ canvaLink: "", driveLink: "", caption: "", scheduledAt: "", contentType: "post", campaignTag: "" });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleStatus = async (id: string, status: string) => {
    await updatePostStatus(id, status);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Posting Calendar</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Schedule and track all content across channels.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError(null); }}
          className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg">
          <Plus size={14} /> Schedule Post
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Scheduled", val: stats.scheduled, icon: Clock, color: "text-blue-500" },
          { label: "Posted", val: stats.posted, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Missed", val: stats.missed, icon: AlertCircle, color: "text-red-500" },
          { label: "Ambassadors", val: stats.ambassadors, icon: Image, color: "text-purple-500" },
          { label: "Open Leads", val: stats.leads, icon: Link2, color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
              <s.icon size={14} className={s.color} />
            </div>
            <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest">New Post</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-[var(--text-muted)]" /></button>
          </div>
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Scheduled Date *</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Content Type</label>
              <select value={form.contentType} onChange={e => setForm(f => ({ ...f, contentType: e.target.value }))} className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Campaign Tag</label>
              <input value={form.campaignTag} onChange={e => setForm(f => ({ ...f, campaignTag: e.target.value }))} placeholder="e.g. May2026" className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Canva Link</label>
              <input value={form.canvaLink} onChange={e => setForm(f => ({ ...f, canvaLink: e.target.value }))} placeholder="https://canva.com/..." className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Drive Link</label>
              <input value={form.driveLink} onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))} placeholder="https://drive.google.com/..." className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Caption Preview</label>
              <input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Caption text..." className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving} className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto">
        {["all","scheduled","posted","missed","draft"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Posts table */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No posts scheduled — add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Caption</th>
                  <th className="px-6 py-4">Links</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {posts.map((p: any) => (
                  <tr key={p.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                    <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white text-[10px] uppercase whitespace-nowrap">
                      {new Date(p.scheduledAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[8px] font-black uppercase rounded-full">{p.contentType ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] max-w-xs truncate text-[10px]">{p.caption ?? "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {p.canvaLink && <a href={p.canvaLink} target="_blank" rel="noreferrer" className="text-[var(--gold)] hover:underline text-[9px] font-black uppercase flex items-center gap-1"><ExternalLink size={10} />Canva</a>}
                        {p.driveLink && <a href={p.driveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[9px] font-black uppercase flex items-center gap-1"><ExternalLink size={10} />Drive</a>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select value={p.status} onChange={e => handleStatus(p.id, e.target.value)}
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {["scheduled","posted","missed","draft"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === "scheduled" && (
                        <button onClick={() => handleStatus(p.id, "posted")} className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full hover:opacity-90">
                          Mark Posted
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

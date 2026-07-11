"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, X, Loader2, AlertCircle, CheckCircle2, Users, User } from "lucide-react";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/actions/stats";

const ROLES = ["all","student","teacher","staff","parent","ambassador","management"];
const PRIORITIES = ["low","medium","high"];
const PRIORITY_COLORS: Record<string,string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", targetRole: "all", priority: "medium" });

  const load = async () => {
    setLoading(true);
    setAnnouncements(await getAnnouncements());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.body) { setError("Title and body required"); return; }
    setSaving(true);
    try {
      await createAnnouncement(form);
      setShowForm(false);
      setForm({ title: "", body: "", targetRole: "all", priority: "medium" });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await deleteAnnouncement(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Announcements</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Broadcast to any role. Appears immediately on their portal dashboard.</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(null); }}
          className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg">
          <Plus size={14} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-8 space-y-5 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Megaphone size={16} className="text-[var(--gold)]" /> Compose Announcement
            </h3>
            <button onClick={() => { setShowForm(false); setError(null); }}><X size={16} className="text-[var(--text-muted)]" /></button>
          </div>
          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-2"><AlertCircle size={12} />{error}</p>}
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title *" className="p-4 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)] md:col-span-2" />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Target Role</label>
              <select value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}
                className="w-full p-4 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)] capitalize">
                {ROLES.map(r => <option key={r} value={r}>{r === "all" ? "All Users" : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full p-4 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4} placeholder="Full announcement message — displayed on all targeted user dashboards *"
            className="w-full p-4 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
          <div className="flex items-center gap-4">
            <button onClick={handleCreate} disabled={saving}
              className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />} Publish Now
            </button>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Publishes immediately — all {form.targetRole} users will see it on login</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-16 text-center">
          <Megaphone size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
          <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No announcements yet — compose one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann: any) => (
            <div key={ann.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm hover:border-[var(--gold)] transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{ann.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${PRIORITY_COLORS[ann.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {ann.priority}
                    </span>
                    <span className="px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[8px] font-black uppercase rounded-full flex items-center gap-1">
                      {ann.targetRole === "all" ? <><Users size={8} /> All Users</> : <><User size={8} />{ann.targetRole}</>}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-[var(--text-muted)] leading-relaxed max-w-2xl">{ann.body}</p>
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-3">
                    {new Date(ann.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                  </p>
                </div>
                <button onClick={() => handleDelete(ann.id)}
                  className="p-2 hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, ChevronDown, ChevronUp, Loader2, X, Check } from "lucide-react";
import {
  getChecklistTemplates, createChecklistTemplate,
  getChecklistEntries, createChecklistEntry, toggleChecklistItem,
} from "@/lib/actions/announcements";
import { getAnnouncements, createAnnouncement, archiveAnnouncement } from "@/lib/actions/announcements";
import { useSession } from "@/lib/auth-client";

const TABS = ["Announcements", "Checklists"];

export default function PRChecklistsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", body: "", priority: "low", targetRole: "all", expiresAt: "" });
  const [annSaving, setAnnSaving] = useState(false);

  const [showTplForm, setShowTplForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", entityType: "STUDENT", items: [""] });
  const [tplSaving, setTplSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [anns, tpls] = await Promise.all([getAnnouncements(), getChecklistTemplates()]);
    setAnnouncements(anns); setTemplates(tpls);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAnnSaving(true);
    await createAnnouncement(annForm);
    setShowAnnForm(false); setAnnForm({ title: "", body: "", priority: "low", targetRole: "all", expiresAt: "" });
    await load(); setAnnSaving(false);
  };

  const handleTplSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setTplSaving(true);
    await createChecklistTemplate({ name: tplForm.name, entityType: tplForm.entityType, items: tplForm.items.filter(Boolean) });
    setShowTplForm(false); setTplForm({ name: "", entityType: "STUDENT", items: [""] });
    await load(); setTplSaving(false);
  };

  const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  if (loading) return <div className="space-y-4 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-16 rounded-2xl bg-[var(--bg-secondary)]"/>)}</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">PR / Operations</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Announcements & Checklists</h1>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              tab === i ? "border-b-2 border-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowAnnForm(!showAnnForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
              <Plus size={14} /> New Announcement
            </button>
          </div>
          {showAnnForm && (
            <form onSubmit={handleAnnSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><input required value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" /></div>
                <div><select value={annForm.priority} onChange={e => setAnnForm(f => ({ ...f, priority: e.target.value }))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {["low","medium","high"].map(p => <option key={p}>{p}</option>)}</select></div>
                <div><select value={annForm.targetRole} onChange={e => setAnnForm(f => ({ ...f, targetRole: e.target.value }))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {["all","student","teacher","staff","ambassador","parent","management"].map(r => <option key={r}>{r}</option>)}</select></div>
                <div><input type="date" value={annForm.expiresAt} onChange={e => setAnnForm(f => ({ ...f, expiresAt: e.target.value }))} placeholder="Expires (optional)" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" /></div>
                <div className="col-span-2"><textarea required value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Announcement body *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)] resize-none" /></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={annSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{annSaving&&<Loader2 size={12} className="animate-spin"/>}Post</button>
                <button type="button" onClick={() => setShowAnnForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {announcements.length === 0 ? <p className="text-[var(--text-muted)] text-sm text-center py-8">No announcements.</p> : announcements.map((a: any) => (
              <div key={a.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_COLORS[a.priority] ?? "bg-gray-100 text-gray-600"}`}>{a.priority}</span>
                      <span className="text-xs text-[var(--text-muted)]">→ {a.targetRole ?? "all"}</span>
                      <span className="text-xs text-[var(--text-muted)]">{new Date(a.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <p className="font-black text-sm text-[var(--navy)] dark:text-white">{a.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{a.body}</p>
                  </div>
                  <button onClick={() => archiveAnnouncement(a.id).then(load)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-[var(--text-muted)] hover:text-red-500 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowTplForm(!showTplForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
              <Plus size={14} /> New Template
            </button>
          </div>
          {showTplForm && (
            <form onSubmit={handleTplSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><input required value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name *" className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" /></div>
                <div><select value={tplForm.entityType} onChange={e => setTplForm(f => ({ ...f, entityType: e.target.value }))} className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                  {["STUDENT","TEACHER","STAFF","AMBASSADOR","CANDIDATE"].map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Checklist Items</p>
                {tplForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input value={item} onChange={e => setTplForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? e.target.value : it) }))} placeholder={`Item ${idx + 1}`}
                      className="flex-1 p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
                    {idx > 0 && <button type="button" onClick={() => setTplForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="p-2 text-[var(--text-muted)] hover:text-red-500"><X size={14} /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setTplForm(f => ({ ...f, items: [...f.items, ""] }))}
                  className="text-xs text-[var(--gold)] font-bold flex items-center gap-1 mt-1"><Plus size={12} /> Add item</button>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={tplSaving} className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">{tplSaving&&<Loader2 size={12} className="animate-spin"/>}Save</button>
                <button type="button" onClick={() => setShowTplForm(false)} className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">Cancel</button>
              </div>
            </form>
          )}
          <div className="space-y-4">
            {templates.length === 0 ? <p className="text-[var(--text-muted)] text-sm text-center py-8">No checklist templates yet.</p> : templates.map((t: any) => (
              <div key={t.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className="text-[var(--gold)]" />
                    <span className="font-black text-xs text-[var(--navy)] dark:text-white uppercase tracking-widest">{t.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{t.entityType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{t.items?.length ?? 0} items</span>
                    {expanded === t.id ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                  </div>
                </button>
                {expanded === t.id && (
                  <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                    {t.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5 text-xs text-[var(--text-muted)]">
                        <div className="w-4 h-4 rounded border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <Check size={10} className="text-[var(--gold)] opacity-0" />
                        </div>
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

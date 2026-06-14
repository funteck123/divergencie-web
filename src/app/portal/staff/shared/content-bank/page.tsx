"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Search, Plus, ExternalLink, Filter, MoreVertical, Loader2, X, Trash2 } from "lucide-react";
import { getAssets, createAsset, deleteAsset } from "@/lib/actions/assets";
import { useSession } from "@/lib/auth-client";

const DEPTS = ["all","PR","Finance","Marketing","IT","HR"];
const TYPES = ["Protocol","Catalogue","Guidebook","Template","Policy","Reference","Other"];

export default function ContentBankPage() {
  const { data: session } = useSession();
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Protocol", driveLink: "", campaignTag: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user as any;

  const load = async () => {
    setLoading(true);
    const data = await getAssets(activeCategory !== "all" ? activeCategory : undefined, search || undefined);
    setAssets(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeCategory]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleAdd = async () => {
    if (!form.name || !form.driveLink) { setError("Name and link required"); return; }
    setSaving(true);
    try {
      await createAsset({ ...form, dept: user?.dept ?? "General" });
      setShowAdd(false);
      setForm({ name: "", type: "Protocol", driveLink: "", campaignTag: "" });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this resource?")) return;
    await deleteAsset(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Content Bank</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Dept-level shared links — protocols, catalogues, and reference materials.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError(null); }}
          className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg">
          <Plus size={14} /> Add Resource
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest">New Resource</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-[var(--text-muted)]" /></button>
          </div>
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <div className="grid md:grid-cols-4 gap-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Resource title *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)] md:col-span-2" />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={form.driveLink} onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))} placeholder="Drive / URL *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.campaignTag} onChange={e => setForm(f => ({ ...f, campaignTag: e.target.value }))} placeholder="Tag (optional)" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
          </div>
          <button onClick={handleAdd} disabled={saving} className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl overflow-x-auto">
          {DEPTS.map(d => (
            <button key={d} onClick={() => setActiveCategory(d)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === d ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
              {d}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] w-64" />
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--gold)]" /></div>
      ) : assets.length === 0 ? (
        <div className="py-24 text-center">
          <FolderOpen size={48} className="mx-auto text-[var(--border-subtle)] mb-4" />
          <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">No resources yet — add one above.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm group hover:border-[var(--gold)] transition-all">
              <div className="flex items-start justify-between mb-4">
                <span className="px-2 py-0.5 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--text-muted)] text-[8px] font-black uppercase tracking-widest rounded-full">{r.type}</span>
                <div className="flex gap-1">
                  <a href={r.driveLink} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-lg transition-all text-[var(--text-muted)] hover:text-[var(--gold)]">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-all text-[var(--text-muted)] hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2 group-hover:text-[var(--gold)] transition-colors">{r.name}</h3>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[9px] font-black text-[var(--gold)] uppercase tracking-widest">{r.dept}</span>
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{new Date(r.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>
              </div>
              {r.campaignTag && <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mt-1"># {r.campaignTag}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, FileText, Star, Video, CheckSquare, ShieldAlert, MoreVertical,
  ChevronRight, ArrowRight, ShieldCheck, ClipboardList, AlertTriangle, Zap, MessageCircle,
  Calendar as CalendarIcon, Plus, X, Loader2
} from "lucide-react";
import { getCandidates, createCandidate, updateCandidateStatus } from "@/lib/actions/hr";
import { getStaffRecords, activateUser, deactivateUser } from "@/lib/actions/hr";

const STAGES = ['Interest', 'Interview', 'Trial Task', 'Offer Sent'];
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  'Offer Sent': 'bg-emerald-100 text-emerald-700',
  'Trial Task': 'bg-amber-100 text-amber-700',
  Interview: 'bg-purple-100 text-purple-700',
  Interest: 'bg-gray-100 text-gray-700',
  inactive: 'bg-red-100 text-red-700',
};

const WA = {
  interview: (n: string, r: string) => `Hi ${n}, your profile for ${r} at DivergenCIE has been shortlisted. We'd like to invite you for a Zoom interview. Are you free this week?`,
  task: (n: string, r: string) => `Hi ${n}, following our interview, we've assigned you a trial task. Please check and submit within 48h.`,
  offer: (n: string, r: string) => `Hi ${n}, congratulations! We are pleased to offer you the position of ${r} at DivergenCIE.`,
};

export default function HRCandidatesPage() {
  const [activeTab, setActiveTab] = useState("bank");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [staffRecords, setStaffRecords] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "", cvLink: "", notes: "", outreach: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [cands, staff] = await Promise.all([getCandidates(query || undefined), getStaffRecords()]);
    setCandidates(cands);
    setStaffRecords(staff);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.role) { setError("Name, email, role required"); return; }
    setSaving(true);
    try {
      await createCandidate(form);
      setShowAdd(false);
      setForm({ name: "", email: "", role: "", cvLink: "", notes: "", outreach: "" });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleStatus = async (id: string, status: string) => {
    await updateCandidateStatus(id, status);
    await load();
  };

  const handleWA = (name: string, role: string, type: keyof typeof WA) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(WA[type](name, role))}`, '_blank');
  };

  const stageIndex = (status: string) => STAGES.indexOf(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">HR Control Center</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage talent acquisition, onboarding, and staff conduct.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg">
          <UserPlus size={14} /> Add Candidate
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-8 shadow-lg space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">New Candidate</h3>
            <button onClick={() => { setShowAdd(false); setError(null); }}><X size={16} className="text-[var(--text-muted)]" /></button>
          </div>
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Role Applied *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.cvLink} onChange={e => setForm(f => ({ ...f, cvLink: e.target.value }))} placeholder="CV Link (optional)" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.outreach} onChange={e => setForm(f => ({ ...f, outreach: e.target.value }))} placeholder="Source (LinkedIn, IG...)" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
          </div>
          <button onClick={handleAdd} disabled={saving} className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add to Bank
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto">
        {[
          { id: "bank", label: "Candidate Bank", icon: Users },
          { id: "pipeline", label: "Hiring Pipeline", icon: Zap },
          { id: "onboarding", label: "Onboarding", icon: CheckSquare },
          { id: "records", label: "Staff Records", icon: ShieldAlert },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {/* Candidate Bank Tab */}
      {activeTab === "bank" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Active Candidates</h3>
            <form onSubmit={handleSearch} className="relative flex gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search talent..." className="pl-8 pr-4 py-1.5 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-lg text-[10px] font-black uppercase outline-none" />
            </form>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No candidates — add one above</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">CV</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {candidates.map((c: any) => (
                    <tr key={c.id} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{c.name}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase tracking-widest text-[9px]">{c.role}</td>
                      <td className="px-6 py-5">
                        <select value={c.status} onChange={e => handleStatus(c.id, e.target.value)}
                          className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border-0 outline-none cursor-pointer ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {['active', 'Interest', 'Interview', 'Trial Task', 'Offer Sent', 'inactive'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-5">
                        {c.cvLink ? <a href={c.cvLink} target="_blank" rel="noreferrer" className="text-[var(--gold)] font-black uppercase text-[10px] hover:underline flex items-center gap-1"><FileText size={12} /> CV</a> : <span className="text-[var(--text-muted)] text-[10px]">—</span>}
                      </td>
                      <td className="px-6 py-5 text-[var(--text-muted)] font-medium text-[10px] max-w-xs truncate">{c.notes ?? "—"}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleWA(c.name, c.role, 'interview')} title="WA: Invite Interview" className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"><MessageCircle size={14} /></button>
                          <button onClick={() => handleWA(c.name, c.role, 'offer')} title="WA: Send Offer" className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-all"><Star size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {loading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div> :
          candidates.filter(c => STAGES.includes(c.status)).length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No candidates in pipeline — advance a candidate from the Bank tab</div>
          ) : candidates.filter(c => STAGES.includes(c.status)).map((c: any) => (
            <div key={c.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">{c.name}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">{c.role}</p>
                </div>
                <button onClick={() => { const next = STAGES[stageIndex(c.status) + 1]; if (next) handleStatus(c.id, next); }}
                  disabled={stageIndex(c.status) >= STAGES.length - 1}
                  className="px-4 py-2 bg-[var(--gold)] text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40">
                  Advance Stage <ArrowRight size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {STAGES.map((stage, idx) => (
                  <div key={idx} className="flex-1 flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full transition-all ${idx <= stageIndex(c.status) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[var(--bg-secondary)] dark:bg-white/10'}`}></div>
                    {idx < STAGES.length - 1 && <ChevronRight size={14} className="text-[var(--border-subtle)]" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                {STAGES.map((stage, idx) => (
                  <span key={idx} className={`text-[8px] font-black uppercase tracking-widest ${idx <= stageIndex(c.status) ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>{stage}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboarding Tab */}
      {activeTab === "onboarding" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-8">
            <ClipboardList size={20} className="text-emerald-500" />
            <h3 className="text-sm font-black uppercase tracking-widest">Onboarding Checklist</h3>
          </div>
          {candidates.filter(c => c.status === 'Offer Sent').length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No candidates at Offer Sent stage yet</p>
          ) : candidates.filter(c => c.status === 'Offer Sent').map((c: any) => (
            <div key={c.id} className="max-w-2xl mb-8 pb-8 border-b border-[var(--border-subtle)]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{c.name}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] font-black uppercase mt-1">Role: {c.role}</p>
                </div>
              </div>
              <div className="space-y-4">
                {["Terms & Conditions Signed", "Account Details & ID Collected", "IT & Data Policy Signed", "Staff Guidebook Sent", "Onboarding Meeting (Zoom 30 mins)"].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-5 h-5 rounded border border-[var(--border-subtle)] group-hover:border-[var(--gold)] flex items-center justify-center transition-all">
                    </div>
                    <span className="text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--navy)] dark:group-hover:text-white">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Records Tab */}
      {activeTab === "records" && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Active & Past Staff</h3>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Dept</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {staffRecords.map((s: any) => (
                    <tr key={s.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{s.name}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[9px]">{s.role}</td>
                      <td className="px-6 py-5 font-bold text-[var(--text-muted)] uppercase text-[9px]">{s.dept ?? "—"}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => s.active ? deactivateUser(s.id).then(load) : activateUser(s.id).then(load)}
                          className={`text-[9px] font-black uppercase tracking-widest hover:underline ${s.active ? 'text-red-500' : 'text-emerald-500'}`}>
                          {s.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

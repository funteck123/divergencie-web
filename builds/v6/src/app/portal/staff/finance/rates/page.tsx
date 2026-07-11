"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Table as TableIcon, Edit3, PieChart, Send, Globe, Plus, Loader2, Check, X } from "lucide-react";
import { getRateCards, upsertRateCard } from "@/lib/actions/finance";

const COUNTRIES = ["UK","MY","IN","KSA","PK"];

export default function FinanceRatesPage() {
  const [activeTab, setActiveTab] = useState("rates");
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ course: "", country: "UK", groupCode: "B", rateGBP: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setRates(await getRateCards());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.course || !form.rateGBP) return;
    setSaving(true);
    await upsertRateCard({ course: form.course, country: form.country, groupCode: form.groupCode, rateGBP: parseFloat(form.rateGBP) });
    setShowAdd(false);
    setForm({ course: "", country: "UK", groupCode: "B", rateGBP: "" });
    await load();
    setSaving(false);
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    setSaving(true);
    await upsertRateCard({ course: editRow.course, country: editRow.country, groupCode: editRow.groupCode, rateGBP: parseFloat(editRow.rateGBP) });
    setEditRow(null);
    await load();
    setSaving(false);
  };

  // group rates by course+groupCode for display
  const grouped: Record<string, any> = {};
  for (const r of rates) {
    const key = `${r.course}||${r.groupCode}`;
    if (!grouped[key]) grouped[key] = { course: r.course, groupCode: r.groupCode };
    grouped[key][r.country] = r.rateGBP;
    grouped[key][`id_${r.country}`] = r.id;
  }
  const rows = Object.values(grouped);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Finance Controls</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage global rate cards and departmental budget allocations.</p>
        </div>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[{ id: "rates", label: "Rate Cards", icon: TableIcon }, { id: "budget", label: "Budget Planner", icon: PieChart }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "rates" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {showAdd && (
            <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-6 space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="Course name" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
                <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={form.groupCode} onChange={e => setForm(f => ({ ...f, groupCode: e.target.value }))} className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
                  {["B","C","T"].map(g => <option key={g}>{g}</option>)}
                </select>
                <input type="number" value={form.rateGBP} onChange={e => setForm(f => ({ ...f, rateGBP: e.target.value }))} placeholder="Rate (GBP)" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                </button>
                <button onClick={() => setShowAdd(false)} className="px-6 py-2 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2"><X size={12} /> Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-[var(--gold)]" /> Rate Card Matrix
              </h3>
              <button onClick={() => setShowAdd(true)} className="text-[9px] font-black text-[var(--gold)] uppercase hover:underline flex items-center gap-1"><Plus size={12} /> Add Rate</button>
            </div>
            {loading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div> :
            rows.length === 0 ? <div className="text-center py-12 text-xs font-bold text-[var(--text-muted)] uppercase">No rate cards — add one above</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Group</th>
                      {COUNTRIES.map(c => <th key={c} className="px-6 py-4">{c} (£ eq)</th>)}
                      <th className="px-6 py-4 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                        <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{r.course}</td>
                        <td className="px-6 py-5 font-black text-[var(--text-muted)] uppercase text-[9px]">{r.groupCode}-Group</td>
                        {COUNTRIES.map(c => (
                          <td key={c} className="px-6 py-5 font-bold text-[var(--navy)] dark:text-white">
                            {r[c] != null ? `£${r[c]}` : "—"}
                          </td>
                        ))}
                        <td className="px-6 py-5 text-right">
                          <button onClick={() => setEditRow({ ...r })} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)]"><Edit3 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {editRow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-2xl p-8 w-full max-w-md space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest">Edit Rate: {editRow.course} — {editRow.country}</h3>
                <input type="number" value={editRow.rateGBP ?? ""} onChange={e => setEditRow((r: any) => ({ ...r, rateGBP: e.target.value }))} placeholder="Rate GBP" className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
                <div className="flex gap-3">
                  <button onClick={handleEditSave} disabled={saving} className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                  </button>
                  <button onClick={() => setEditRow(null)} className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl"><X size={12} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Budget planner — SHR-04 claims auto-populate from attendance. Management approval workflow: Finance submits → Management approves. Full implementation in next phase.</p>
          </div>
          <div className="bg-[var(--navy)] text-white rounded-3xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-2">Management Approval</h3>
                <p className="text-2xl font-black uppercase tracking-tight max-w-md">Submit finalized monthly budget for executive review</p>
              </div>
              <button className="px-8 py-4 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 flex items-center gap-3">
                <Send size={16} /> Submit to Management
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

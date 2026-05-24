"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Plus, Download, CheckCircle2, Clock, AlertCircle, DollarSign, User, Filter, X, Loader2, MessageCircle } from "lucide-react";
import { getInvoices, createInvoice, updateInvoiceStatus, getInvoiceStats, advanceReminderStage, WA_REMINDER_STAGES } from "@/lib/actions/finance";
import { ShieldCheck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
  due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30",
};

export default function FinanceInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, collected: 0, pending: 0, overdue: 0 });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentId: "", month: "", amount: "", status: "due" });
  const [error, setError] = useState<string | null>(null);
  const [waResult, setWaResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const load = async () => {
    setLoading(true);
    const [invs, st] = await Promise.all([getInvoices(query || undefined), getInvoiceStats()]);
    setInvoices(invs);
    setStats(st);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.studentId || !form.month || !form.amount) { setError("Student ID, month, and amount required"); return; }
    setSaving(true);
    try {
      await createInvoice({ studentId: form.studentId, month: form.month, amount: parseFloat(form.amount), status: form.status });
      setShowForm(false); setForm({ studentId: "", month: "", amount: "", status: "due" });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleMarkPaid = async (id: string) => {
    await updateInvoiceStatus(id, "paid");
    await load();
  };

  const handleMarkOverdue = async (id: string) => {
    await updateInvoiceStatus(id, "overdue");
    await load();
  };

  const handleReminder = async (id: string) => {
    const result = await advanceReminderStage(id);
    setWaResult(result);
    await load();
    window.open(`https://wa.me/?text=${encodeURIComponent(result.waMessage)}`, '_blank');
  };

  const filtered = invoices.filter(inv =>
    (statusFilter === "all" || inv.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Invoices</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage student billing, scholarships, and payment tracking.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg">
          <Plus size={14} /> Generate Invoice
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[{id:"invoices",label:"Invoices"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab===t.id?"bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm":"text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "invoices" && (<>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Billed", val: `£${stats.total.toFixed(0)}`, icon: DollarSign, color: "text-blue-500" },
          { label: "Collected", val: `£${stats.collected.toFixed(0)}`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Pending", val: `£${stats.pending.toFixed(0)}`, icon: Clock, color: "text-amber-500" },
          { label: "Overdue", val: stats.overdue, icon: AlertCircle, color: "text-red-500" },
        ].map((s, i) => (
          <div key={i} className="p-5 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
              <s.icon size={14} className={s.color} />
            </div>
            <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-8 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">New Invoice</h3>
            <button onClick={() => { setShowForm(false); setError(null); }}><X size={16} /></button>
          </div>
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Student ID</label>
              <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="Student DB ID (cuid)" className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Month (YYYY-MM)</label>
              <input value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} placeholder="2026-05" className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Amount (£)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="450.00" className="w-full p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving} className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Invoice
          </button>
        </div>
      )}

      {/* Invoice list */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">All Invoices</h3>
          <div className="flex gap-2">
            <form onSubmit={e => { e.preventDefault(); load(); }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student..." className="pl-8 pr-4 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg text-[10px] font-black uppercase outline-none" />
            </form>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-8 pr-4 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg text-[10px] font-black uppercase outline-none appearance-none cursor-pointer">
                <option value="all">All</option>
                <option value="due">Due</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No invoices found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reminder</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((inv: any) => (
                  <tr key={inv.id} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5 font-mono text-[10px] text-[var(--text-muted)]">{inv.id.slice(0, 8)}…</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-[var(--text-muted)]" />
                        <span className="font-bold text-[var(--navy)] dark:text-white">{(inv as any).student?.name ?? inv.studentId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-[var(--text-muted)]">{inv.month}</td>
                    <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">£{inv.amount}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {inv.status !== "paid" ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= (inv.reminderStage ?? 0) ? "bg-[var(--gold)]" : "bg-[var(--bg-secondary)] dark:bg-white/10"}`}></div>)}</div>
                          <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">S{inv.reminderStage ?? 0}</span>
                        </div>
                      ) : <span className="text-[8px] text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== "paid" && (
                          <button onClick={() => handleReminder(inv.id)} title={`Send WA reminder (Stage ${(inv.reminderStage ?? 0) + 1})`} className="p-2 hover:bg-green-50 text-green-500 rounded-lg transition-all">
                            <MessageCircle size={15} />
                          </button>
                        )}
                        {inv.status !== "paid" && (
                          <button onClick={() => handleMarkPaid(inv.id)} title="Mark Paid" className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-lg transition-all">
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {inv.status === "due" && (
                          <button onClick={() => handleMarkOverdue(inv.id)} title="Mark Overdue" className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-all">
                            <AlertCircle size={15} />
                          </button>
                        )}
                        <button title="Download PDF (stub)" className="p-2 hover:bg-blue-50 text-blue-400 rounded-lg transition-all">
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>)}

    </div>
  );
}

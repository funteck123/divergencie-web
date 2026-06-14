"use client";

import { useState, useEffect } from "react";
import { DollarSign, Plus, ChevronDown, ChevronUp, Loader2, Receipt } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getAmbassadorClaims, getAmbassadorCommissions, createAmbassadorClaim } from "@/lib/actions/ambassador";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const TABS = ["My Claims", "Commissions"];

export default function AmbassadorClaimsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [tab, setTab] = useState(0);
  const [claims, setClaims] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ month: "", currency: "MYR", notes: "", commissionAmount: "" });

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [c, com] = await Promise.all([
      getAmbassadorClaims(user.id),
      getAmbassadorCommissions(user.id),
    ]);
    setClaims(c ?? []);
    setCommissions(com ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.month) return;
    setSaving(true);
    await createAmbassadorClaim({
      ambassadorId: user.id,
      month: form.month,
      currency: form.currency,
      notes: form.notes,
      commissionAmount: form.commissionAmount ? parseFloat(form.commissionAmount) : 0,
    });
    setShowForm(false);
    setForm({ month: "", currency: "MYR", notes: "", commissionAmount: "" });
    await load();
    setSaving(false);
  };

  const totalPending = claims.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
  const totalApproved = claims.filter(c => c.status === "approved").reduce((s, c) => s + (c.commissionAmount ?? 0), 0);

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Commission & Claims</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{claims.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Total Claims</p>
        </div>
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-600">MYR {totalPending.toFixed(2)}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Pending</p>
        </div>
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">MYR {totalApproved.toFixed(2)}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Approved</p>
        </div>
      </div>

      {/* Tabs */}
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
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
              <Plus size={14} /> New Claim
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Submit Commission Claim</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Month *</label>
                  <input type="month" required value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]">
                    {["MYR","USD","GBP","INR"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Commission Amount</label>
                  <input type="number" step="0.01" value={form.commissionAmount} onChange={e => setForm(f => ({ ...f, commissionAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    placeholder="Any notes about this claim..."
                    className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)] resize-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={12} className="animate-spin" />} Submit Claim
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {claims.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
              <Receipt size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-muted)] text-sm">No claims submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim: any) => (
                <div key={claim.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[claim.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {claim.status}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{claim.month}</span>
                      </div>
                      <p className="font-black text-lg text-[var(--navy)] dark:text-white">
                        {claim.currency} {(claim.commissionAmount ?? 0).toFixed(2)}
                      </p>
                      {claim.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5">{claim.notes}</p>}
                    </div>
                    <button onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)]">
                      {expanded === claim.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {expanded === claim.id && (
                    <div className="border-t border-[var(--border-subtle)] px-5 py-4 space-y-4">
                      {/* Paychecks */}
                      {claim.paychecks?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Paychecks</p>
                          <div className="space-y-2">
                            {claim.paychecks.map((pc: any) => (
                              <div key={pc.id} className="flex items-center justify-between bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{pc.month}</span>
                                <span className="text-xs text-[var(--text-muted)]">{pc.currency} {pc.subtotal?.toFixed(2)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[pc.status] ?? "bg-slate-100 text-slate-600"}`}>{pc.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* History */}
                      {claim.history?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Status History</p>
                          <div className="space-y-1.5 pl-3 border-l-2 border-[var(--border-subtle)]">
                            {claim.history.map((h: any) => (
                              <div key={h.id} className="text-[11px] text-[var(--text-muted)]">
                                <span className="font-bold text-[var(--navy)] dark:text-white">{h.fromStatus || "—"}</span>
                                {" → "}
                                <span className="font-bold text-[var(--navy)] dark:text-white">{h.toStatus}</span>
                                <span className="ml-2 opacity-60">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                                {h.reason && <span className="ml-2 italic">— "{h.reason}"</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          {commissions.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
              <DollarSign size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-muted)] text-sm">No commission records found.</p>
            </div>
          ) : commissions.map((list: any) => (
            <div key={list.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-widest text-[var(--navy)] dark:text-white">
                  Commission List · {list.items?.length ?? 0} items
                </p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${list.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {list.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {list.items?.map((item: any) => {
                  const student = item.studentEnrolmentItem?.enrolmentList?.student;
                  return (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-[var(--navy)] dark:text-white">{student?.name ?? "Unknown Student"}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{student?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[var(--gold)]">{item.commissionPct}%</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[item.status?.toLowerCase()] ?? "bg-slate-100 text-slate-600"}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Activated: {new Date(item.activatedAt).toLocaleDateString("en-GB")}
                        {item.pausedAt && <span className="ml-3">Paused: {new Date(item.pausedAt).toLocaleDateString("en-GB")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

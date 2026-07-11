"use client";

import { useState, useEffect } from "react";
import { Users, Link, Copy, ChevronDown, ChevronUp, Plus, Loader2, Check } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getAmbassadorReferrals, getAmbassadorProfile, createReferral } from "@/lib/actions/ambassador";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
};

export default function AmbassadorReferralsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [referrals, setReferrals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [codeForm, setCodeForm] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [refs, prof] = await Promise.all([
      getAmbassadorReferrals(user.id),
      getAmbassadorProfile(user.id),
    ]);
    setReferrals(refs ?? []);
    setProfile(prof);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const referralCode = profile?.referralCode ?? (user as any)?.referralCode;
  const referralLink = referralCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?ref=${referralCode}` : null;

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeForm.trim()) return;
    setSaving(true);
    await createReferral({ referrerId: user.id, code: codeForm.trim() });
    setShowForm(false);
    setCodeForm("");
    await load();
    setSaving(false);
  };

  const total = referrals.length;
  const converted = referrals.filter(r => r.status === "converted").length;
  const totalClicks = referrals.reduce((s, r) => s + (r.clicks?.length ?? 0), 0);
  const totalEnrolmentConversions = referrals.reduce((s, r) => s + (r.clicks?.filter((c: any) => c.convertedToEnrolment).length ?? 0), 0);

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Referrals</h1>
      </div>

      {/* Referral link card */}
      {referralCode && (
        <div className="bg-gradient-to-br from-[var(--navy)] to-[var(--navy)]/80 rounded-2xl p-6 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] mb-1">Your Referral Link</p>
          <p className="font-mono text-sm text-white/80 mb-4 break-all">{referralLink}</p>
          <div className="flex gap-3">
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-xl text-xs font-bold">
              <Link size={12} className="text-[var(--gold)]" /> Code: <span className="font-mono text-[var(--gold)]">{referralCode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: total },
          { label: "Converted", value: converted },
          { label: "Total Clicks", value: totalClicks },
          { label: "Enrolments", value: totalEnrolmentConversions },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[var(--navy)] dark:text-white">{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Referrals ({referrals.length})</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90">
            <Plus size={12} /> New
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5 mb-4 flex gap-3">
            <input value={codeForm} onChange={e => setCodeForm(e.target.value)} required
              placeholder="Custom referral code (e.g. FRIEND2025)"
              className="flex-1 p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-1.5">
              {saving && <Loader2 size={12} className="animate-spin" />} Create
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">
              Cancel
            </button>
          </form>
        )}

        {referrals.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
            <Users size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
            <p className="text-[var(--text-muted)] text-sm">No referrals yet. Share your link to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any) => {
              const isOpen = expanded === ref.id;
              const clicks = ref.clicks ?? [];
              const enquiryClicks = clicks.filter((c: any) => c.convertedToEnquiry).length;
              const enrolmentClicks = clicks.filter((c: any) => c.convertedToEnrolment).length;
              return (
                <div key={ref.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[ref.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {ref.status}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-muted)]">{ref.code}</span>
                      </div>
                      <div className="flex gap-4 text-[11px] text-[var(--text-muted)]">
                        <span>{clicks.length} clicks</span>
                        {enquiryClicks > 0 && <span className="text-amber-600 font-bold">{enquiryClicks} enquiries</span>}
                        {enrolmentClicks > 0 && <span className="text-emerald-600 font-bold">{enrolmentClicks} enrolments</span>}
                        <span>{new Date(ref.createdAt).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                    {clicks.length > 0 && (
                      <button onClick={() => setExpanded(isOpen ? null : ref.id)}
                        className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)]">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {isOpen && clicks.length > 0 && (
                    <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Click Activity</p>
                      <div className="space-y-1.5">
                        {clicks.slice(0, 10).map((click: any) => (
                          <div key={click.id} className="flex items-center justify-between text-[11px] py-1 border-b border-[var(--border-subtle)] last:border-0">
                            <span className="text-[var(--text-muted)]">{new Date(click.clickedAt).toLocaleDateString("en-GB")} {new Date(click.clickedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                            <div className="flex gap-2">
                              {click.convertedToEnquiry && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Enquiry</span>}
                              {click.convertedToEnrolment && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Enrolled</span>}
                              {!click.convertedToEnquiry && !click.convertedToEnrolment && <span className="text-[var(--text-muted)]">Click only</span>}
                            </div>
                          </div>
                        ))}
                        {clicks.length > 10 && <p className="text-[10px] text-[var(--text-muted)]">+{clicks.length - 10} more</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

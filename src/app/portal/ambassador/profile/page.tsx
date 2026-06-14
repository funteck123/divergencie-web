"use client";

import { useState, useEffect } from "react";
import { User, Award, Calendar, Link, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getAmbassadorProfile, upsertAmbassadorProfile, getAmbassadorEnrolments } from "@/lib/actions/ambassador";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function AmbassadorProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [profile, setProfile] = useState<any>(null);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    cohort: "",
    referralCode: "",
    programmeDuration: "",
    programmeStart: "",
    programmeEnd: "",
  });

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [p, e] = await Promise.all([
      getAmbassadorProfile(user.id),
      getAmbassadorEnrolments(user.id),
    ]);
    setProfile(p);
    setEnrolments(e);
    if (p) {
      setForm({
        cohort: p.cohort ?? "",
        referralCode: p.referralCode ?? "",
        programmeDuration: p.programmeDuration ?? "",
        programmeStart: p.programmeStart ? new Date(p.programmeStart).toISOString().slice(0,10) : "",
        programmeEnd: p.programmeEnd ? new Date(p.programmeEnd).toISOString().slice(0,10) : "",
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await upsertAmbassadorProfile(user.id, form);
    await load();
    setEditing(false);
    setSaving(false);
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Ambassador Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">My Profile</h1>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
              <User size={18} className="text-[var(--gold)]" />
            </div>
            <div>
              <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{user?.name ?? "Ambassador"}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest border border-[var(--border-subtle)] rounded-xl hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors">
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Cohort</label>
                <input value={form.cohort} onChange={e => setForm(f => ({ ...f, cohort: e.target.value }))}
                  placeholder="e.g. Cohort 3 — Spring 2025"
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Referral Code</label>
                <input value={form.referralCode} onChange={e => setForm(f => ({ ...f, referralCode: e.target.value }))}
                  placeholder="DC-AMB-XXXX"
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Programme Duration</label>
                <input value={form.programmeDuration} onChange={e => setForm(f => ({ ...f, programmeDuration: e.target.value }))}
                  placeholder="e.g. 6 months"
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Programme Start</label>
                <input type="date" value={form.programmeStart} onChange={e => setForm(f => ({ ...f, programmeStart: e.target.value }))}
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Programme End</label>
                <input type="date" value={form.programmeEnd} onChange={e => setForm(f => ({ ...f, programmeEnd: e.target.value }))}
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={12} className="animate-spin" />} Save
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-5 py-2 border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--bg-secondary)]">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {!profile ? (
              <div className="text-center py-6">
                <p className="text-[var(--text-muted)] text-sm mb-4">No profile set up yet.</p>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
                  <Plus size={14} /> Set Up Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <Stat icon={<Award size={14} />} label="Cohort" value={profile.cohort ?? "—"} />
                <Stat icon={<User size={14} />} label="Referral Code" value={profile.referralCode ?? "—"} mono />
                <Stat icon={<Calendar size={14} />} label="Duration" value={profile.programmeDuration ?? "—"} />
                <Stat icon={<Calendar size={14} />} label="Programme Period"
                  value={profile.programmeStart
                    ? `${new Date(profile.programmeStart).toLocaleDateString("en-GB")} — ${profile.programmeEnd ? new Date(profile.programmeEnd).toLocaleDateString("en-GB") : "ongoing"}`
                    : "—"} />
                {profile.completionStatus && (
                  <Stat icon={<Award size={14} />} label="Completion" value={profile.completionStatus} />
                )}
                {profile.certificateLink && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Certificate</p>
                    <a href={profile.certificateLink} target="_blank" rel="noreferrer"
                      className="text-xs text-[var(--gold)] font-bold flex items-center gap-1 hover:underline">
                      <Link size={11} /> View Certificate
                    </a>
                  </div>
                )}
                {profile.linkedInBadgeLink && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">LinkedIn Badge</p>
                    <a href={profile.linkedInBadgeLink} target="_blank" rel="noreferrer"
                      className="text-xs text-[var(--gold)] font-bold flex items-center gap-1 hover:underline">
                      <Link size={11} /> View Badge
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enrolments */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">My Enrolments ({enrolments.length})</h2>
        {enrolments.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 text-center">
            <p className="text-[var(--text-muted)] text-sm">No enrolments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrolments.map((list: any) => (
              <div key={list.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">{list.serviceType}</span>
                    <span className="ml-2 text-[10px] text-[var(--text-muted)]">{list.items?.length ?? 0} items</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${list.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {list.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {list.items?.map((item: any) => (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                          {item.ambassadorService?.title ?? "Service"}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[var(--text-muted)] mb-3">
                        {item.startDate && <span>Start: {new Date(item.startDate).toLocaleDateString("en-GB")}</span>}
                        {item.endDate && <span>End: {new Date(item.endDate).toLocaleDateString("en-GB")}</span>}
                        {item.ambassadorService?.rate && (
                          <span>Rate: {item.ambassadorService.currency ?? "MYR"} {item.ambassadorService.rate}</span>
                        )}
                      </div>
                      {item.history?.length > 0 && (
                        <div>
                          <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--gold)]">
                            {expanded === item.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            History ({item.history.length})
                          </button>
                          {expanded === item.id && (
                            <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-[var(--border-subtle)]">
                              {item.history.map((h: any) => (
                                <div key={h.id} className="text-[11px] text-[var(--text-muted)]">
                                  <span className="font-bold">{h.fromStatus}</span> → <span className="font-bold">{h.toStatus}</span>
                                  <span className="ml-2 opacity-60">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                                  {h.reason && <span className="ml-2 italic">"{h.reason}"</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
        <span className="text-[var(--gold)]">{icon}</span>
        {label}
      </div>
      <p className={`text-sm font-bold text-[var(--navy)] dark:text-white ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

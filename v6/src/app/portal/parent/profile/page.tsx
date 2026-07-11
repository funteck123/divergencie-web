"use client";

import { useState, useEffect } from "react";
import { User, Phone, MapPin, GraduationCap, Loader2, Plus, BookOpen, BarChart2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getParentProfile, upsertParentProfile, getLinkedChildren } from "@/lib/actions/profile";

export default function ParentProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [profile, setProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", address: "" });

  const load = async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    const [p, kids] = await Promise.all([
      getParentProfile(user.id),
      getLinkedChildren(user.email),
    ]);
    setProfile(p);
    setChildren(kids ?? []);
    if (p) setForm({ phone: p.phone ?? "", address: p.address ?? "" });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await upsertParentProfile(user.id, form);
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
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Parent Portal</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">My Profile</h1>
      </div>

      {/* Account card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
              <User size={18} className="text-[var(--gold)]" />
            </div>
            <div>
              <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{user?.name ?? "Parent"}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest border border-[var(--border-subtle)] rounded-xl hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Phone Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+44 7700 000000"
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={3}
                  placeholder="Home address..."
                  className="w-full p-2.5 text-sm border border-[var(--border-subtle)] bg-transparent rounded-lg outline-none focus:border-[var(--gold)] resize-none" />
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
              <div className="text-center py-4">
                <p className="text-[var(--text-muted)] text-sm mb-4">No contact details set.</p>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">
                  <Plus size={14} /> Add Contact Details
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    <Phone size={12} className="text-[var(--gold)]" /> Phone
                  </div>
                  <p className="text-sm font-bold text-[var(--navy)] dark:text-white">{profile.phone ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    <MapPin size={12} className="text-[var(--gold)]" /> Address
                  </div>
                  <p className="text-sm font-bold text-[var(--navy)] dark:text-white whitespace-pre-line">{profile.address ?? "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked children */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <GraduationCap size={14} /> Linked Students ({children.length})
        </h2>
        {children.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 text-center">
            <p className="text-[var(--text-muted)] text-sm">No students linked to your account yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Contact management to link your child's account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child: any) => {
              const overallPct = child.progress?.length > 0
                ? Math.round(child.progress.reduce((s: number, p: any) => s + p.pct, 0) / child.progress.length)
                : 0;
              return (
                <div key={child.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{child.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{child.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[var(--gold)]">{overallPct}%</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Overall Progress</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--gold)] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl p-3">
                      <p className="text-lg font-black text-[var(--navy)] dark:text-white">{child.progress?.length ?? 0}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subjects</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl p-3">
                      <p className="text-lg font-black text-[var(--navy)] dark:text-white">{child.attendances?.length ?? 0}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sessions</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl p-3">
                      <p className="text-lg font-black text-[var(--navy)] dark:text-white">{child.mockScore ?? "—"}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Mock Score</p>
                    </div>
                  </div>

                  {/* Next session */}
                  {child.nextSession && (
                    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Next Session</p>
                      <p className="text-xs font-bold text-[var(--navy)] dark:text-white">
                        {new Date(child.nextSession.startTime).toLocaleDateString("en-GB")} with {child.nextSession.teacher?.name ?? "—"}
                      </p>
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

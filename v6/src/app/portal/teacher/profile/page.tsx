"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  User, Link, ShieldCheck, CreditCard, BookOpen,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  ExternalLink, Activity
} from "lucide-react";

type EnrolItem = {
  id: string;
  status: string;
  isActive: boolean;
  trialRequired: boolean;
  startDate: string | null;
  endDate: string | null;
  activatedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  service: { id: string; name: string; type: string };
  history: { id: string; fromStatus: string; toStatus: string; changedAt: string; reason: string | null }[];
};
type EnrolList = { id: string; serviceType: string; isActive: boolean; items: EnrolItem[] };

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  TRIAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  WAITING_CONFIRMATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ENDED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function EnrolCard({ list }: { list: EnrolList }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-between">
        <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">{list.serviceType}</span>
        <span className={`text-xs font-bold ${list.isActive ? "text-emerald-600" : "text-gray-400"}`}>{list.isActive ? "Active List" : "Inactive"}</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {list.items.length === 0 && (
          <p className="px-5 py-4 text-sm text-[var(--text-muted)]">No enrolment items.</p>
        )}
        {list.items.map(item => (
          <div key={item.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[var(--navy)] dark:text-white text-sm">{item.service.name}</span>
                  <StatusBadge status={item.status} />
                  {item.trialRequired && <span className="text-xs text-sky-600 font-semibold">Trial Required</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                  {item.startDate && <span>Start: {new Date(item.startDate).toLocaleDateString("en-GB")}</span>}
                  {item.endDate && <span>End: {new Date(item.endDate).toLocaleDateString("en-GB")}</span>}
                  {item.activatedAt && <span>Activated: {new Date(item.activatedAt).toLocaleDateString("en-GB")}</span>}
                  {item.cancellationReason && <span className="text-red-500">Reason: {item.cancellationReason}</span>}
                </div>
              </div>
              {item.history.length > 0 && (
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="flex items-center gap-1 text-xs text-[var(--gold)] font-bold hover:underline shrink-0"
                >
                  History {expanded === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
            {expanded === item.id && (
              <div className="mt-3 ml-3 border-l-2 border-[var(--gold)]/30 pl-3 space-y-1.5">
                {item.history.map(h => (
                  <div key={h.id} className="text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--navy)] dark:text-white">{h.fromStatus} → {h.toStatus}</span>
                    <span className="ml-2">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                    {h.reason && <span className="ml-2 italic">"{h.reason}"</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [profile, setProfile] = useState<{ firstName?: string; lastName?: string; teachingProfileUrl?: string; idDocProvided?: boolean; salaryAccountProvided?: boolean } | null>(null);
  const [enrolments, setEnrolments] = useState<EnrolList[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", teachingProfileUrl: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id && !user?.email) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/profile/teacher?userId=${user.id ?? ""}&email=${user.email ?? ""}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enrolments/teacher?teacherId=${user.id ?? user.email ?? ""}`).then(r => r.ok ? r.json() : []),
    ]).then(([prof, enr]) => {
      if (prof) {
        setProfile(prof);
        setForm({ firstName: prof.firstName ?? "", lastName: prof.lastName ?? "", teachingProfileUrl: prof.teachingProfileUrl ?? "" });
      }
      setEnrolments(Array.isArray(enr) ? enr : []);
    }).finally(() => setLoading(false));
  }, [user?.id, user?.email]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/teacher", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...form }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-secondary)] dark:bg-white/5" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Your Profile</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Teacher Profile</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{user?.email}</p>
      </div>

      {/* Identity card */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[var(--gold)]" />
            <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">Identity</span>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-[var(--gold)] hover:underline">Edit</button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">First Name</label>
                <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))}
                  className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white focus:ring-2 focus:ring-[var(--gold)] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Last Name</label>
                <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))}
                  className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white focus:ring-2 focus:ring-[var(--gold)] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Teaching Profile URL</label>
              <input value={form.teachingProfileUrl} onChange={e => setForm(f => ({...f, teachingProfileUrl: e.target.value}))}
                placeholder="https://..." className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--bg-secondary)] dark:bg-white/10 dark:text-white focus:ring-2 focus:ring-[var(--gold)] outline-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-[var(--gold)] text-white font-bold rounded-xl text-sm disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="px-5 py-2 border border-[var(--border-subtle)] font-bold rounded-xl text-sm dark:text-white">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">Full Name</p>
              <p className="font-semibold text-[var(--navy)] dark:text-white">
                {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">Email</p>
              <p className="font-semibold text-[var(--navy)] dark:text-white">{user?.email}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-0.5">Teaching Profile</p>
              {profile?.teachingProfileUrl ? (
                <a href={profile.teachingProfileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--gold)] font-semibold hover:underline">
                  View Profile <ExternalLink size={12} />
                </a>
              ) : <p className="text-[var(--text-muted)]">Not provided</p>}
            </div>
          </div>
        )}
      </div>

      {/* Compliance status */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-[var(--gold)]" />
          <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">Compliance</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] dark:bg-white/5">
            {profile?.idDocProvided
              ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              : <XCircle size={20} className="text-red-400 shrink-0" />}
            <div>
              <p className="text-xs font-black uppercase text-[var(--text-muted)]">ID Document</p>
              <p className="text-sm font-bold text-[var(--navy)] dark:text-white">{profile?.idDocProvided ? "Provided" : "Pending"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] dark:bg-white/5">
            {profile?.salaryAccountProvided
              ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              : <XCircle size={20} className="text-red-400 shrink-0" />}
            <div>
              <p className="text-xs font-black uppercase text-[var(--text-muted)]">Salary Account</p>
              <p className="text-sm font-bold text-[var(--navy)] dark:text-white">{profile?.salaryAccountProvided ? "Provided" : "Pending"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolments */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-[var(--gold)]" />
          <span className="font-black text-sm text-[var(--navy)] dark:text-white uppercase tracking-widest">Enrolments</span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{enrolments.length} list{enrolments.length !== 1 ? "s" : ""}</span>
        </div>
        {enrolments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
            <Activity size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)] text-sm">No enrolments yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrolments.map(list => <EnrolCard key={list.id} list={list} />)}
          </div>
        )}
      </div>
    </div>
  );
}

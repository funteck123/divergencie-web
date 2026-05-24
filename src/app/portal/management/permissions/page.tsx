"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, Save, RefreshCcw, Info, Globe, Shield, Users, UserCheck, GraduationCap, UserCircle } from "lucide-react";

export default function TicketPermissionsPage() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const user = session?.user as any;
  const isManagement = user?.role === "management";

  async function fetchPermissions() {
    setLoading(true);
    try {
      const res = await fetch("/api/management/permissions");
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isManagement) fetchPermissions();
  }, [isManagement]);

  async function handleToggle(id: string, field: string, value: boolean) {
    setSaving(id);
    try {
      const res = await fetch("/api/management/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data: { [field]: value } }),
      });
      if (res.ok) {
        setPermissions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      }
    } finally {
      setSaving(null);
    }
  }

  if (status === "loading") return <div className="p-20 text-center font-black uppercase tracking-[0.4em] animate-pulse">Synchronizing Auth...</div>;
  if (!isManagement) return <div className="p-20 text-center font-black uppercase tracking-[0.4em] text-red-500">Access Denied - Management Level Only</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div>
        <h1 className="text-5xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter italic flex items-center gap-4">
          <ShieldCheck size={48} className="text-[var(--gold)]" /> Access <span className="text-[var(--gold)]">Matrix</span>
        </h1>
        <p className="text-[var(--text-muted)] font-black mt-2 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
          <Info size={14} className="text-[var(--gold)]" /> Control cross-departmental ticketing flow and external targeting rules.
        </p>
      </div>

      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] dark:bg-white/5">
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--navy)] dark:text-white border-b border-[var(--border-subtle)]">Department</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Internal Only</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">PR</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">IT</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">HR</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Finance</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Mkt</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Mgmt</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Student</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Parent</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Teacher</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Ambassador</th>
                <th className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-center">Candidate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {permissions.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                  <td className="px-10 py-6 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${p.isInternalOnly ? 'bg-red-500' : 'bg-emerald-500'} transition-all`}></div>
                      <div>
                        <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">{p.department}</p>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                          {p.isInternalOnly ? 'Restricted to Internal' : 'Omnichannel Enabled'}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  {/* Internal Only Toggle */}
                  <td className="px-6 py-6 border-b border-[var(--border-subtle)] text-center">
                    <ToggleButton 
                      active={p.isInternalOnly} 
                      onChange={(v: boolean) => handleToggle(p.id, 'isInternalOnly', v)} 
                      loading={saving === p.id}
                      icon={<Shield size={12} />}
                      color="red"
                    />
                  </td>

                  {/* Internal Toggles */}
                  {['canTargetPR', 'canTargetIT', 'canTargetHR', 'canTargetFinance', 'canTargetMarketing', 'canTargetManagement'].map(field => (
                    <td key={field} className="px-6 py-6 border-b border-[var(--border-subtle)] text-center">
                      <ToggleButton 
                        active={p[field]} 
                        onChange={(v: boolean) => handleToggle(p.id, field, v)} 
                        loading={saving === p.id}
                        icon={<Shield size={12} />}
                        color="blue"
                      />
                    </td>
                  ))}

                  {/* External Toggles */}
                  {['canTargetStudent', 'canTargetParent', 'canTargetTeacher', 'canTargetAmbassador', 'canTargetCandidate'].map((field, i) => (
                    <td key={field} className="px-6 py-6 border-b border-[var(--border-subtle)] text-center">
                      <ToggleButton 
                        active={p[field]} 
                        onChange={(v: boolean) => handleToggle(p.id, field, v)} 
                        loading={saving === p.id}
                        disabled={p.isInternalOnly}
                        icon={
                          field === 'canTargetStudent' ? <GraduationCap size={12} /> :
                          field === 'canTargetParent' ? <Users size={12} /> :
                          field === 'canTargetTeacher' ? <UserCheck size={12} /> :
                          field === 'canTargetAmbassador' ? <Globe size={12} /> :
                          <UserCircle size={12} />
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 opacity-40">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Restricted</span>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ active, onChange, loading, disabled, icon, color = "emerald" }: any) {
  return (
    <button
      onClick={() => !disabled && onChange(!active)}
      disabled={loading || disabled}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
        disabled ? 'opacity-20 cursor-not-allowed bg-gray-200' :
        active 
          ? color === 'red' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
          : 'bg-gray-200 dark:bg-white/10'
      }`}
    >
      <div className={`absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 ${active ? 'translate-x-6 rotate-[360deg]' : 'translate-x-0'} ${loading ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
    </button>
  );
}

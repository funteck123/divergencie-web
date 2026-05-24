"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Search, MoreVertical, Copy, Check, X, UserCheck, UserX, Loader2 } from "lucide-react";
import { getStaffMembers, getExternalUsers, toggleUserStatus, createUser } from "@/lib/actions/users";

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-100 text-blue-600",
  parent: "bg-amber-100 text-amber-600",
  teacher: "bg-emerald-100 text-emerald-600",
  staff: "bg-orange-100 text-orange-600",
  management: "bg-purple-100 text-purple-600",
  ambassador: "bg-pink-100 text-pink-600",
  candidate: "bg-gray-100 text-gray-600",
};

export default function ManagementUsersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'student', dept: '— N/A —', supervisor: false });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string|null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, students: 0, staff: 0, ambassadors: 0 });

  const load = async () => {
    setLoading(true);
    const [staff, external] = await Promise.all([getStaffMembers(), getExternalUsers()]);
    const all = [...staff, ...external];
    setUsers(all);
    setStats({
      total: all.length,
      students: all.filter(u => u.role === "student").length,
      staff: all.filter(u => ["staff", "teacher", "management"].includes(u.role)).length,
      ambassadors: all.filter(u => u.role === "ambassador").length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string, active: boolean) => {
    await toggleUserStatus(id, !active);
    await load();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = users.filter(u =>
    (activeTab === "all" || u.role === activeTab) &&
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Users</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage all accounts, roles, and access levels.</p>
        </div>
        <button onClick={() => setShowAddPanel(!showAddPanel)}
          className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[var(--gold)]/20">
          {showAddPanel ? <X size={14} /> : <UserPlus size={14} />}
          {showAddPanel ? "Close" : "Add New User"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", val: stats.total },
          { label: "Active Students", val: stats.students },
          { label: "Staff & Teachers", val: stats.staff },
          { label: "Ambassadors", val: stats.ambassadors },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl">
            <p className="text-xl font-black text-[var(--navy)] dark:text-white">{s.val}</p>
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Panel */}
      {showAddPanel && (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-6">Create New Account</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Full Name</label>
              <input type="text" placeholder="e.g. Priya Sharma" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Email Address</label>
              <input type="email" placeholder="priya@example.com" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Role</label>
              <select className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-bold outline-none">
                {["student","parent","teacher","staff","ambassador","management"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Department</label>
              <select className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-bold outline-none">
                {["— N/A —","PR","HR","Finance","Marketing","IT"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Supervisor</label>
              <select className="w-full p-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 rounded-xl text-xs font-bold outline-none">
                <option>No — Member</option>
                <option>Yes — Supervisor / HOD</option>
              </select>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Invite Link</label>
            <div className="flex gap-2">
              <input type="text" value={inviteLink} readOnly placeholder="Generate invite link..."
                className="flex-1 p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-[10px] font-mono text-[var(--text-muted)]" />
              <button type="button" onClick={() => setInviteLink(`https://divergencie.co.uk/auth/invite?t=${Math.random().toString(36).substring(7)}`)}
                className="px-6 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90">Generate</button>
              {inviteLink && (
                <button type="button" onClick={handleCopy} className="px-4 bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--border-subtle)] rounded-xl hover:border-[var(--gold)] transition-all">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-[var(--text-muted)]" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            {createError && <p className="text-xs text-red-500 font-bold">{createError}</p>}
            <button onClick={() => setShowAddPanel(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cancel</button>
            <button onClick={async () => {
              if (!formData.name || !formData.email) { setCreateError("Name and email required"); return; }
              setCreating(true); setCreateError(null);
              try {
                await createUser({ name: formData.name, email: formData.email, role: formData.role, dept: formData.dept !== "— N/A —" ? formData.dept : undefined, supervisor: formData.supervisor });
                setShowAddPanel(false);
                await load();
              } catch(e: any) { setCreateError(e.message); }
              setCreating(false);
            }} disabled={creating} className="px-10 py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50">
              {creating ? "Creating…" : "Add User"}
            </button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 md:pb-0">
            {['all','student','parent','teacher','staff','management','ambassador'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab ? 'text-[var(--gold)] underline underline-offset-8' : 'text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input type="text" placeholder="Search name or email..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-medium outline-none focus:border-[var(--gold)] w-64" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Dept / Subject</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No users found</td></tr>
                ) : filtered.map((user: any) => (
                  <tr key={user.id} className="text-xs hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--navy)] dark:bg-white/10 flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{user.name}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">{user.dept ?? "—"}</span>
                        {user.supervisor && <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Supervisor</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{user.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggle(user.id, user.active)} title={user.active ? "Deactivate" : "Activate"}
                          className={`p-2 rounded-lg transition-all ${user.active ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600'}`}>
                          {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all text-[var(--text-muted)]"><MoreVertical size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

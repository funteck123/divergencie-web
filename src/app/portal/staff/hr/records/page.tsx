"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  FileText, 
  MoreVertical,
  ShieldCheck,
  Mail,
  Building,
  Briefcase,
  AlertCircle,
  Globe,
  UserCheck,
  Star,
  BookOpen,
  UserX,
  UserPlus,
  ShieldAlert
} from "lucide-react";
import { useSession } from "next-auth/react";
import { getStaffMembers, getExternalUsers, toggleUserStatus } from "@/lib/actions/users";

export default function HRStaffRecordsPage() {
  const { data: session, status: authStatus } = useSession();
  const [staff, setStaff] = useState<any[]>([]);
  const [external, setExternal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");

  const subGroup = (session?.user as any)?.subGroup;
  const role = (session?.user as any)?.role;
  const isAuthorized = role === "management" || subGroup === "HR_SUP";

  const fetchData = () => {
    if (!isAuthorized) return;
    setLoading(true);
    Promise.all([
      getStaffMembers(),
      getExternalUsers()
    ]).then(([staffData, externalData]) => {
      setStaff(staffData);
      setExternal(externalData.filter(u => u.role === 'teacher' || u.role === 'ambassador'));
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load records:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchData();
    }
  }, [authStatus, isAuthorized]);

  if (authStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl animate-in zoom-in-95 duration-500">
        <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-full mb-6">
          <ShieldAlert size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase text-[var(--navy)] dark:text-white tracking-tight">Restricted Archive</h2>
        <p className="text-[var(--text-muted)] font-medium mt-2 max-w-sm mx-auto">Access to personnel records is limited to HR Supervisors and Management only.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-8 px-8 py-3 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus(userId, !currentStatus);
      fetchData(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const teachers = external.filter(u => u.role === 'teacher').filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  
  const ambassadors = external.filter(u => u.role === 'ambassador').filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStaff = staff.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.dept || "").toLowerCase().includes(search.toLowerCase())
  );

  const UserTable = ({ data, title, icon: Icon, colorClass = "text-[var(--gold)]" }: any) => (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
      <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/30 dark:bg-white/2">
        <div className="flex items-center gap-2">
          <Icon size={18} className={colorClass} />
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">{title}</h3>
        </div>
        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{data.length} Total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <th className="px-6 py-4">Identity</th>
              <th className="px-6 py-4">Role Details</th>
              <th className="px-6 py-4">Department / Entity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[10px] font-black uppercase text-[var(--text-muted)]">No records found</td>
              </tr>
            ) : data.map((u: any) => (
              <tr key={u.id} className={`text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors ${!u.active ? 'opacity-50 grayscale' : ''}`}>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{u.name}</span>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1 mt-0.5 tracking-tight">
                      <Mail size={10} className="text-[var(--gold)]" /> {u.email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="font-bold text-[var(--navy)] dark:text-white uppercase tracking-widest text-[9px] flex items-center gap-2">
                    <Briefcase size={12} className={colorClass} />
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-lg font-black text-[var(--text-muted)] uppercase tracking-widest text-[9px] border border-[var(--border-subtle)]">
                    {u.dept ? <><Building size={12} className={colorClass} /> {u.dept}</> : <><Globe size={12} className="text-blue-500" /> EXTERNAL</>}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    {u.active ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[8px] font-black uppercase tracking-widest">ACTIVE</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[8px] font-black uppercase tracking-widest">INACTIVE</span>
                    )}
                    {u.supervisor && (
                      <div className="p-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md" title="Authorized Supervisor">
                        <ShieldCheck size={14} className="text-emerald-500" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleToggleStatus(u.id, u.active)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                        u.active 
                          ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100" 
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100"
                      }`}
                    >
                      {u.active ? <><UserX size={12} /> Deactivate</> : <><UserPlus size={12} /> Reactivate</>}
                    </button>
                    <button className="p-1.5 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg transition-all text-[var(--text-muted)]">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Personnel Center</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Centralized directory for DivergenCIE ecosystem members.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
          <input 
            type="text" 
            placeholder="Search all records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2.5 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase outline-none focus:border-[var(--gold)] transition-all min-w-[300px] shadow-sm" 
          />
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab("internal")}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "internal" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
        >
          <UserCheck size={14} /> Internal Payroll
        </button>
        <button 
          onClick={() => setActiveTab("external")}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "external" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}
        >
          <Globe size={14} /> Global Partners
        </button>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <div className="w-10 h-10 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
             <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Accessing Secured Records...</span>
          </div>
        ) : activeTab === "internal" ? (
          <UserTable data={filteredStaff} title="Full-Time Personnel" icon={Users} />
        ) : (
          <>
            <UserTable data={teachers} title="Certified Instructors" icon={BookOpen} colorClass="text-emerald-500" />
            <UserTable data={ambassadors} title="Ambassador Network" icon={Star} colorClass="text-blue-500" />
          </>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={12} className="text-red-500" />
          Sensitive Control: Deactivating an account revokes all login sessions immediately.
        </p>
      </div>
    </div>
  );
}

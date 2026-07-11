"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Plus, X, Send, AlertCircle, User, Globe, Shield } from "lucide-react";
import { getStaffMembers, getExternalUsers } from "@/lib/actions/users";

interface Props {
  creatorId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function TicketCreateForm({ creatorId, onSuccess, onClose }: Props) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isInternal = user?.role === "staff" || user?.role === "management";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetType, setTargetType] = useState<"internal" | "external">("internal");
  
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [externalUsers, setExternalUsers] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState("PR");
  const [selectedExtRole, setSelectedExtRole] = useState("student");
  const [allPermissions, setAllPermissions] = useState<any[]>([]);

  const deptPerm = allPermissions.find(p => p.department === user?.dept);

  // Restrictions based on role
  const allPossibleDepts = ["PR", "IT", "HR", "Finance", "Marketing", "Management"];
  const availableDepts = user?.role === "candidate" ? ["HR"] : allPossibleDepts.filter(d => {
    if (user?.role === "management") return true;
    if (!isInternal) {
      return d !== "Management";
    }
    if (!deptPerm) {
      // If permissions aren't loaded yet OR this dept isn't in the matrix
      // Default to permissive for staff unless restricted
      return true;
    }
    if (d === "PR") return deptPerm.canTargetPR;
    if (d === "IT") return deptPerm.canTargetIT;
    if (d === "HR") return deptPerm.canTargetHR;
    if (d === "Finance") return deptPerm.canTargetFinance;
    if (d === "Marketing") return deptPerm.canTargetMarketing;
    if (d === "Management") return deptPerm.canTargetManagement;
    return true;
  });

  useEffect(() => {
    if (user?.role === "candidate") setSelectedDept("HR");
    else if (!availableDepts.includes(selectedDept)) setSelectedDept(availableDepts[0] || "PR");
  }, [user, availableDepts]);

  useEffect(() => {
    // Initial data fetch
    getStaffMembers().then(setAllStaff);
    getExternalUsers().then(setExternalUsers);
    
    fetch("/api/tickets/categories")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDbCategories(data);
        else setDbCategories([]);
      })
      .catch(() => setDbCategories([]));

    fetch("/api/management/permissions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllPermissions(data);
      });
  }, []);


  const getCategories = (dept: string) => {
    return dbCategories.filter(c => c.department === dept).map(c => c.name);
  };

  // Compute filtered staff list - staff can only assign to own department members
  const filteredStaff = allStaff.filter(s => 
    (selectedDept === "Management" ? s.role === "management" : s.dept === selectedDept) &&
    s.id !== user?.id &&
    (user?.role === "management" || s.dept === user?.dept)
  );

  // Compute filtered external users list
  const filteredExternal = externalUsers.filter(u => u.role === selectedExtRole);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      department: targetType === "internal" ? formData.get("department") : "EXTERNAL",
      priority: formData.get("priority"),
      assigneeId: formData.get("assigneeId"),
      category: formData.get("category"),
      attachmentLink: formData.get("attachmentLink"),
    };

    if (!data.assigneeId && targetType === "external") {
      setError("Please select a specific external contact.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.details || resData.error || "Failed to create ticket");
      }

      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      setError(err.message);
      console.error("Ticket Creation Error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-8 shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">New Support Ticket</h2>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Initialize internal or external support thread</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      {/* Target Toggle - Only for Staff/Management */}
      {isInternal && (
        <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl mb-8">
          <button 
            type="button"
            onClick={() => setTargetType("internal")}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${targetType === "internal" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            <Shield size={14} /> Internal Dept
          </button>
          {(!deptPerm || !deptPerm.isInternalOnly) && (
            <button 
              type="button"
              onClick={() => setTargetType("external")}
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${targetType === "external" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              <Globe size={14} /> External User
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject / Title</label>
          <input 
            name="title" 
            required 
            placeholder="Describe the issue briefly..."
            className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {targetType === "internal" ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Department</label>
                <select 
                  name="department" 
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                >
                  {availableDepts.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              {isInternal && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assign To (Optional)</label>
                  <select 
                    name="assigneeId" 
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                  >
                    <option value="">-- Let Dept. Handle --</option>
                    {filteredStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Category (Optional)</label>
                <select 
                  name="category"
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                >
                  <option value="">-- Choose Category --</option>
                  {getCategories(selectedDept).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">External Role</label>
                <select 
                  value={selectedExtRole}
                  onChange={(e) => setSelectedExtRole(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                >
                  {["student", "teacher", "parent", "ambassador", "candidate"].filter(r => {
                    if (user?.role === "management") return true;
                    if (!deptPerm) return false;
                    
                    if (r === "student") return deptPerm.canTargetStudent;
                    if (r === "parent") return deptPerm.canTargetParent;
                    if (r === "teacher") return deptPerm.canTargetTeacher;
                    if (r === "ambassador") return deptPerm.canTargetAmbassador;
                    if (r === "candidate") return deptPerm.canTargetCandidate;
                    return false;
                  }).map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Target Individual</label>
                <select 
                  name="assigneeId" 
                  required
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                >
                  <option value="">-- Choose Person --</option>
                  {filteredExternal.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Category (Optional)</label>
                <select 
                  name="category"
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none font-bold"
                >
                  <option value="">-- Choose Category --</option>
                  {getCategories("EXTERNAL").map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Priority Level</label>
          <select 
            name="priority" 
            className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all appearance-none"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL" defaultValue="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Message / Description</label>
          <textarea 
            name="description" 
            required 
            rows={4}
            placeholder="Describe the issue or request in detail..."
            className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Attachment (GDrive Link)</label>
          <input 
            name="attachmentLink" 
            placeholder="https://drive.google.com/..."
            className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button 
          disabled={loading}
          className="w-full py-4 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
        >
          {loading ? "Initializing..." : <><Send size={14} /> Create Ticket</>}
        </button>
      </form>
    </div>
  );
}

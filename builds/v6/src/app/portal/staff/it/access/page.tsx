"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Search, 
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { getAccessLogs, createAccessLog, revokeAccess } from "@/lib/actions/it";
import { motion, AnimatePresence } from "framer-motion";

function ITAccessPageInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ staffName: "", toolName: "Zoom", credential: "", notes: "" });

  useEffect(() => {
    setLoading(true);
    getAccessLogs(query).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAccessLog(formData);
    setIsModalOpen(false);
    setFormData({ staffName: "", toolName: "Zoom", credential: "", notes: "" });
    const updated = await getAccessLogs(query);
    setLogs(updated);
  };

  const handleRevoke = async (id: string) => {
    if (confirm("Revoke access for this user?")) {
      await revokeAccess(id);
      const updated = await getAccessLogs(query);
      setLogs(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Access Control</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage software credentials and tool assignments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
        >
          <UserPlus size={16} /> Assign Access
        </button>
      </div>

      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tool / Account</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Credential Info</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date Granted</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest italic opacity-50">No access logs found.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase">{log.staffName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase rounded-lg">
                      {log.toolName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-[11px] font-mono bg-[var(--bg-secondary)] dark:bg-white/10 px-2 py-1 rounded text-[var(--text-muted)]">
                      {log.credential || "N/A"}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    {log.revoked ? (
                      <div className="flex items-center gap-1.5 text-red-500 font-black text-[9px] uppercase tracking-widest">
                        <ShieldAlert size={12} /> Revoked
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                        <ShieldCheck size={12} /> Active
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)]">
                      <Clock size={12} /> {new Date(log.dateGranted).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!log.revoked && (
                      <button 
                        onClick={() => handleRevoke(log.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline"
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2">Assign Access</h2>
              <p className="text-[var(--text-muted)] font-medium mb-8">Create a new tool credential for a staff member.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Staff Member Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.staffName}
                    onChange={(e) => setFormData({...formData, staffName: e.target.value})}
                    placeholder="e.g. Sarah Lorde"
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tool Type</label>
                    <select 
                      value={formData.toolName}
                      onChange={(e) => setFormData({...formData, toolName: e.target.value})}
                      className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all text-sm font-medium"
                    >
                      <option value="Zoom">Zoom</option>
                      <option value="Whiteboard">MS Whiteboard</option>
                      <option value="GCR">G. Classroom</option>
                      <option value="Email">Outlook/Work Email</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Credential ID</label>
                    <input 
                      type="text"
                      value={formData.credential}
                      onChange={(e) => setFormData({...formData, credential: e.target.value})}
                      placeholder="e.g. Host Key"
                      className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Notes (Optional)</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any extra info..."
                    className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--gold)] transition-all min-h-[100px]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ITAccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24 text-[var(--gold)] font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
      <ITAccessPageInner />
    </Suspense>
  );
}

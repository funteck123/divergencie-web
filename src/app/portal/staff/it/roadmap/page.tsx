"use client";

import { useState, useEffect } from "react";
import { Cpu, Plus, Check, Clock, AlertCircle, X, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { getAccessLogs } from "@/lib/actions/it";

// IT-05: roadmap stored in Asset table with dept=IT, type=Roadmap
import { getAssets, createAsset, deleteAsset } from "@/lib/actions/assets";

const STATUSES = ["Planned","In Progress","Done","Blocked"] as const;
const STATUS_COLORS: Record<string, string> = {
  "Planned": "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  "Done": "bg-emerald-100 text-emerald-700",
  "Blocked": "bg-red-100 text-red-700",
};
const STATUS_ICONS: Record<string, any> = {
  "Planned": Clock,
  "In Progress": AlertCircle,
  "Done": Check,
  "Blocked": X,
};

const INTEGRATIONS = [
  { name: "Google Classroom (GCR)", description: "Class links, assignment sync, batch invites", status: "In Progress" },
  { name: "Zoom Webhook", description: "Auto-import recording URLs after class ends", status: "Planned" },
  { name: "Google Drive", description: "Content bank, notes library, recording storage", status: "In Progress" },
  { name: "Stripe Payment Gateway", description: "Global card payments for UK/International", status: "Planned" },
  { name: "FPX / DuitNow (MY)", description: "Malaysian bank transfer integration", status: "Planned" },
  { name: "WhatsApp Business API", description: "Automated reminders, attendance alerts, invoice nudges", status: "Planned" },
  { name: "Google Calendar", description: "Class schedule sync, meeting creation, reminders", status: "Planned" },
  { name: "Portal Auth (NextAuth v5)", description: "Role-based JWT, Google OAuth, invite registration", status: "Done" },
  { name: "Prisma + SQLite DB", description: "All portal data — users, tickets, attendance, invoices", status: "Done" },
];

export default function ITRoadmapPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", driveLink: "", campaignTag: "Planned" });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showIntegrations, setShowIntegrations] = useState(true);

  const load = async () => {
    setLoading(true);
    // IT roadmap tasks stored as Assets with dept=IT, type=Roadmap
    const assets = await getAssets("IT");
    setTasks(assets.filter((a: any) => a.type === "Roadmap"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    await createAsset({ name: form.name, type: "Roadmap", driveLink: form.driveLink || "#", dept: "IT", campaignTag: form.campaignTag });
    setShowAdd(false);
    setForm({ name: "", driveLink: "", campaignTag: "Planned" });
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
    await load();
  };

  const filtered = tasks.filter(t => filterStatus === "all" || t.campaignTag === filterStatus);

  const integrationsByStatus = (status: string) => INTEGRATIONS.filter(i => i.status === status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">IT Roadmap</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Integration status, planned work, and platform task tracking.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg">
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Integration status board */}
      <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setShowIntegrations(s => !s)} className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
          <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} className="text-[var(--gold)]" /> Platform Integrations
          </h3>
          <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${showIntegrations ? "rotate-180" : ""}`} />
        </button>
        {showIntegrations && (
          <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-6 py-4">Integration</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {INTEGRATIONS.map((item, i) => {
                  const Icon = STATUS_ICONS[item.status] ?? Clock;
                  return (
                    <tr key={i} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5">
                      <td className="px-6 py-4 font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{item.name}</td>
                      <td className="px-6 py-4 text-[var(--text-muted)] font-medium text-[10px] max-w-xs">{item.description}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[item.status]}`}>
                          <Icon size={10} />{item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom tasks */}
      {showAdd && (
        <div className="bg-white dark:bg-white/5 border border-[var(--gold)] rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest">New Task</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-[var(--text-muted)]" /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Task title *" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)] md:col-span-2" />
            <select value={form.campaignTag} onChange={e => setForm(f => ({ ...f, campaignTag: e.target.value }))} className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)]">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input value={form.driveLink} onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))} placeholder="Ticket / Doc link (optional)" className="p-3 border border-[var(--border-subtle)] rounded-xl text-xs font-bold bg-transparent outline-none focus:border-[var(--gold)] md:col-span-3" />
          </div>
          <button onClick={handleAdd} disabled={saving} className="px-8 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save Task
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto">
        {["all", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
          No custom tasks — add one above. Integration status board shows built-in items.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task: any) => {
            const Icon = STATUS_ICONS[task.campaignTag] ?? Clock;
            return (
              <div key={task.id} className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[var(--gold)] transition-all shadow-sm">
                <div className="flex items-center gap-4">
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${STATUS_COLORS[task.campaignTag] ?? "bg-gray-100 text-gray-700"}`}>
                    <Icon size={10} />{task.campaignTag ?? "—"}
                  </span>
                  <p className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{task.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.driveLink && task.driveLink !== "#" && (
                    <a href={task.driveLink} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)]">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-[var(--text-muted)] hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

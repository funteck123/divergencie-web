"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Database, Search, Save, Trash2, X, ChevronRight, AlertCircle, Table } from "lucide-react";

const TABLES = [
  "user", "ticket", "ticketCategory", "claim", "lead", "candidate", "academicSession", "referral", "invoice", "meeting"
];

export default function DatabaseManagementPage() {
  const { data: session, status } = useSession();
  const [selectedTable, setSelectedTable] = useState("user");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>({});
  const [query, setQuery] = useState("");

  const user = session?.user as any;
  const isManagement = user?.role === "management";

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/management/db?table=${selectedTable}`);
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isManagement) fetchData();
  }, [selectedTable, isManagement]);

  async function handleSave() {
    if (!editingId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/management/db", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, id: editingId, data: editBuffer }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchData();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/management/db", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, id }),
      });
      if (res.ok) fetchData();
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <div className="p-20 text-center font-black uppercase tracking-[0.4em] animate-pulse">Initializing Terminal...</div>;
  if (!isManagement) return <div className="p-20 text-center font-black uppercase tracking-[0.4em] text-red-500">Access Denied - Management Only</div>;

  const filtered = data.filter(row => 
    Object.values(row).some(val => String(val).toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
            <Database size={32} className="text-[var(--gold)]" /> Database <span className="text-[var(--gold)]">Orchestrator</span>
          </h1>
          <p className="text-[var(--text-muted)] font-black mt-1 text-[9px] uppercase tracking-[0.2em]">Low-level direct access to production tables.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Table List */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6 flex items-center gap-2">
              <Table size={14} /> Schema Tables
            </h3>
            <div className="space-y-2">
              {TABLES.map(t => (
                <button
                  key={t}
                  onClick={() => { setSelectedTable(t); setEditingId(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${selectedTable === t ? "bg-[var(--gold)] text-black" : "hover:bg-white/5 text-[var(--text-muted)] hover:text-white"}`}
                >
                  {t}
                  <ChevronRight size={14} className={selectedTable === t ? "opacity-100" : "opacity-0 group-hover:opacity-50"} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data View */}
        <div className="col-span-9 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative flex-1 group">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search in ${selectedTable}...`}
                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-[10px] font-bold outline-none focus:border-[var(--gold)] transition-all shadow-sm"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
            <button 
              onClick={fetchData} 
              className="px-6 py-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[var(--gold)] transition-all"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)]">Actions</th>
                    {data.length > 0 && Object.keys(data[0]).map(key => (
                      <th key={key} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)]">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                          {editingId === row.id ? (
                            <>
                              <button onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:scale-110 transition-all"><Save size={14} /></button>
                              <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500 text-white rounded-lg hover:scale-110 transition-all"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setEditingId(row.id); setEditBuffer({ ...row }); }}
                                className="p-2 bg-indigo-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(row.id)}
                                className="p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      {Object.keys(row).map(key => (
                        <td key={key} className="px-6 py-4 border-b border-[var(--border-subtle)]">
                          {editingId === row.id && key !== "id" && key !== "createdAt" && key !== "updatedAt" ? (
                            <input 
                              type={typeof row[key] === "number" ? "number" : "text"}
                              value={editBuffer[key] === null ? "" : editBuffer[key]}
                              onChange={(e) => {
                                const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
                                setEditBuffer({ ...editBuffer, [key]: val });
                              }}
                              className="w-full bg-[var(--bg-secondary)] dark:bg-white/10 border border-[var(--gold)] rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                            />
                          ) : (
                            <div className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-[var(--navy)] dark:text-white/80">
                              {row[key] === null ? <span className="opacity-30 italic">null</span> : String(row[key])}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-20 text-center opacity-30">
                <AlertCircle size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No records in this sector</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, Search } from "lucide-react";

interface Category {
  id: string;
  name: string;
  department: string;
}

interface Props {
  userRole: string;
  userSubGroup?: string;
}

export default function CategoryManager({ userRole, userSubGroup }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDept, setNewCatDept] = useState("PR");
  const [adding, setAdding] = useState(false);

  const isSupervisor = userRole === "management" || userSubGroup === "supervisor";

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tickets/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, department: newCatDept })
      });
      if (res.ok) {
        setNewCatName("");
        fetchCategories();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this category?")) return;
    const res = await fetch(`/api/tickets/categories/${id}`, { method: "DELETE" });
    if (res.ok) fetchCategories();
  }

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.department.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5">
        <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-2">Category Management</h2>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Define and oversee ticket classifications across all departments.</p>
      </div>

      <div className="p-8 flex flex-col md:flex-row gap-6">
        {/* Add Form */}
        <form onSubmit={handleAdd} className="flex-1 space-y-4 p-6 bg-blue-50/50 dark:bg-blue-900/5 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2">Add New Category</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-[var(--text-muted)]">Category Name</label>
              <input 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Policy Query"
                className="w-full p-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--gold)] transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-[var(--text-muted)]">Department</label>
              <select 
                value={newCatDept}
                onChange={(e) => setNewCatDept(e.target.value)}
                className="w-full p-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)] transition-all appearance-none"
              >
                {["PR", "IT", "HR", "Finance", "Marketing", "Management", "EXTERNAL"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            disabled={adding || !newCatName}
            className="w-full py-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Category"}
          </button>
        </form>

        {/* Search */}
        <div className="flex-1 space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Existing Categories</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or dept..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--gold)] transition-all"
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl group transition-all hover:border-[var(--gold)]">
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">{c.name}</p>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{c.department}</p>
                </div>
                {isSupervisor && (
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-10 text-[10px] font-bold text-[var(--text-muted)] uppercase italic">No categories found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import TicketList from "@/components/portal/tickets/TicketList";
import TicketDetail from "@/components/portal/tickets/TicketDetail";
import TicketCreateForm from "@/components/portal/tickets/TicketCreateForm";
import { Search, Plus, ShieldAlert, Filter, Inbox, Activity } from "lucide-react";

export default function ManagementTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [filterType, setFilterType] = useState<"all" | "received" | "created">("all");

  const user = session?.user as any;

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (selectedTicket) {
          const updated = data.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const filtered = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(query.toLowerCase()) ||
                         t.creator.name.toLowerCase().includes(query.toLowerCase());
    
    // 1. Action Required: It's specifically your turn.
    const isSpecificallyAssignedToMe = t.assigneeId === user?.id;
    const isActionRequired = isSpecificallyAssignedToMe; // Management doesn't have a "dept" unassigned bucket by default

    // 2. Involved: You are the creator or you have touched it (history)
    const isInvolved = t.creatorId === user?.id || t.history?.some((h: any) => h.actorId === user?.id);

    let matchesStatus = false;
    if (activeTab === "active") {
      // For management, "Active" queue strictly follows turn-taking like staff
      matchesStatus = t.status !== "CLOSED" && isActionRequired;
    } else if (activeTab === "processing") {
      // Processing shows things management specifically touched that aren't their turn
      matchesStatus = t.status !== "CLOSED" && !isActionRequired && isInvolved;
    } else if (activeTab === "history") {
      matchesStatus = t.status === "CLOSED";
    }

    let matchesType = true;
    if (filterType === "received") matchesType = t.creatorId !== user?.id;
    if (filterType === "created") matchesType = t.creatorId === user?.id;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const escalatedCount = tickets.filter(t => t.priority === "HIGH" && t.status === "OPEN").length;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">System Oversight</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Global ticket monitoring and escalation management.</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab("active")}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              Open
            </button>
            <button 
              onClick={() => setActiveTab("processing")}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "processing" ? "bg-white dark:bg-white/10 text-blue-500 shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              Processing
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              Closed
            </button>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-[var(--navy)] dark:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={16} /> Create System Ticket
          </button>
        </div>
      </div>

      {/* Escalation Alert */}
      {escalatedCount > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-center gap-3 animate-pulse">
          <ShieldAlert size={20} className="text-red-600 shrink-0" />
          <p className="text-xs font-black text-red-800 dark:text-red-400 uppercase tracking-widest">
            {escalatedCount} HIGH PRIORITY tickets require management review
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 h-full min-h-0">
        {/* Left Sidebar: List */}
        <div className="lg:col-span-4 flex flex-col space-y-6 min-h-0">
          <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl">
            <button 
              onClick={() => setFilterType("all")}
              className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filterType === "all" ? "bg-white dark:bg-white/10 text-[var(--navy)] dark:text-white shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType("received")}
              className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filterType === "received" ? "bg-white dark:bg-white/10 text-emerald-600 shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              Received
            </button>
            <button 
              onClick={() => setFilterType("created")}
              className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filterType === "created" ? "bg-white dark:bg-white/10 text-blue-600 shadow-sm" : "text-[var(--text-muted)]"}`}
            >
              Created
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-center">
              <p className="text-xl font-black text-[var(--navy)] dark:text-white">{tickets.length}</p>
              <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Active</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-center">
              <p className="text-xl font-black text-[var(--gold)]">{tickets.filter(t => t.status === "OPEN").length}</p>
              <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Awaiting</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Search global tickets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-xs outline-none focus:border-[var(--gold)] transition-all shadow-sm"
            />
          </div>

          <div className="flex-1 min-h-0">
            <TicketList 
              tickets={filtered} 
              onSelect={setSelectedTicket} 
              selectedId={selectedTicket?.id} 
            />
          </div>
        </div>

        {/* Right Area: Detail or Welcome */}
        <div className="lg:col-span-8 min-h-0">
          {selectedTicket ? (
            <TicketDetail 
              ticket={selectedTicket} 
              currentUserId={user?.id}
              currentUserRole={user?.role}
              currentSubGroup={user?.subGroup}
              onUpdate={fetchTickets}
            />
          ) : (
            <div className="h-full bg-[var(--bg-secondary)] dark:bg-white/5 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl flex flex-col items-center justify-center p-20 text-center opacity-40">
              <Activity size={48} className="text-[var(--text-muted)] mb-4" />
              <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-4">Command Center</h2>
              <p className="text-sm font-medium text-[var(--text-muted)] max-w-xs leading-relaxed">Select any ticket from the global queue to override, assign, or escalate.</p>
            </div>
          )}
        </div>
      </div>

      {/* Overlays */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <TicketCreateForm 
            creatorId={user?.id} 
            onSuccess={fetchTickets}
            onClose={() => setShowCreate(false)}
          />
        </div>
      )}
    </div>
  );
}

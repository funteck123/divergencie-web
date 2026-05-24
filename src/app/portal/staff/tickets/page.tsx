"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TicketList from "@/components/portal/tickets/TicketList";
import TicketDetail from "@/components/portal/tickets/TicketDetail";
import TicketCreateForm from "@/components/portal/tickets/TicketCreateForm";
import CategoryManager from "@/components/portal/tickets/CategoryManager";
import { Search, Plus, SlidersHorizontal, Inbox, Settings2, CheckCircle2 } from "lucide-react";

export default function StaffTicketsPage() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicketState] = useState<any>(null);
  
  const setSelectedTicket = (t: any) => {
    setSelectedTicketState(t);
  };

  const user = session?.user as any;
  const isLoaded = status !== "loading" && !!session;
  
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "processing" | "history" | "categories">("active");
  const [filterType, setFilterType] = useState<"all" | "received" | "created">("all");

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
    if (isLoaded) fetchTickets();
  }, [isLoaded]);

  const filtered = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(query.toLowerCase()) ||
                         t.creator.name.toLowerCase().includes(query.toLowerCase());
    
    // 1. Action Required: It's specifically your turn.
    const isSpecificallyAssignedToMe = t.assigneeId === user?.id;
    const isUnassignedInMyDept = !t.assigneeId && t.department === user?.dept && user?.supervisor;
    const isActionRequired = isSpecificallyAssignedToMe || isUnassignedInMyDept;

    // 2. Involved: You are the creator or you have touched it (history)
    const isInvolved = t.creatorId === user?.id || t.history?.some((h: any) => h.actorId === user?.id);
    
    let matchesStatus = false;
    if (activeTab === "active") {
      // Action Required is strictly for things you need to do right now
      matchesStatus = t.status !== "CLOSED" && isActionRequired;
    } else if (activeTab === "processing") {
      // Processing is for tickets you are involved in but aren't currently your responsibility
      matchesStatus = t.status !== "CLOSED" && !isActionRequired && isInvolved;
    } else if (activeTab === "history") {
      matchesStatus = t.status === "CLOSED";
    }

    let matchesType = true;
    if (filterType === "received") matchesType = t.creatorId !== user?.id;
    if (filterType === "created") matchesType = t.creatorId === user?.id;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (status !== "loading" && !session) return <div className="p-20 text-center font-black uppercase tracking-[0.4em] text-red-500">Access Denied - Please Login</div>;
  if (!isLoaded) return <div className="p-20 text-center font-black uppercase tracking-[0.4em] animate-pulse opacity-50">Synchronizing Session...</div>;

  return (
    <div className="flex flex-col h-full space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter italic text-glow">Support <span className="text-[var(--gold)]">Center</span></h1>
          <p className="text-[var(--text-muted)] font-black mt-1 max-w-xl text-[9px] uppercase tracking-[0.2em] leading-loose">Orchestrate internal operations and external student support threads.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${activeTab === "categories" ? "bg-[var(--gold)] text-black shadow-lg" : "bg-white dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--gold)]"}`}
          >
            <Settings2 size={16} /> Categories
          </button>
          <button 
            onClick={() => setShowCreate(true)}
            className="px-8 py-4 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
          >
            <Plus size={20} /> New Ticket
          </button>
        </div>
      </div>

      {activeTab !== "categories" ? (
        <>
          {/* Main Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="md:col-span-1 flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl border border-[var(--border-subtle)]">
              {[
                { id: "active", label: "Open", icon: Inbox },
                { id: "processing", label: "Processing", icon: SlidersHorizontal },
                { id: "history", label: "Closed", icon: CheckCircle2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.id 
                      ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  <tab.icon size={14} />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-2 flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl border border-[var(--border-subtle)]">
              {[
                { id: "all", label: "All Threads" },
                { id: "received", label: "Received" },
                { id: "created", label: "Created" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    filterType === type.id 
                      ? "bg-white dark:bg-white/10 text-[var(--navy)] dark:text-white shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="md:col-span-1 relative group">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject or name..."
                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-[10px] font-bold outline-none focus:border-[var(--gold)] transition-all shadow-sm group-hover:border-[var(--gold)]/50"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors" />
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 min-h-[600px] items-start">
            {/* List Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
                  <SlidersHorizontal size={12} /> {activeTab === "active" ? "Active Queue" : activeTab === "processing" ? "Pending Threads" : "Archived / Closed"}
                </h3>
                <span className="px-3 py-1 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black text-[9px] font-black rounded-full shadow-lg">
                  {filtered.length}
                </span>
              </div>
              
              <div className="min-h-0">
                <TicketList 
                  tickets={filtered} 
                  onSelect={setSelectedTicket} 
                  selectedId={selectedTicket?.id} 
                />
              </div>
            </div>

            {/* Detail View */}
            <div className="lg:col-span-8 min-h-0">
              {selectedTicket ? (
                <TicketDetail 
                  key={selectedTicket.id}
                  ticket={selectedTicket} 
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  currentSubGroup={user?.subGroup}
                  onUpdate={fetchTickets}
                />
              ) : (
                <div className="h-full min-h-[500px] bg-[var(--bg-secondary)] dark:bg-white/5 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] flex flex-col items-center justify-center p-20 text-center opacity-30 group hover:opacity-50 transition-all">
                  <div className="w-24 h-24 bg-[var(--border-subtle)] rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Inbox size={40} className="text-[var(--text-muted)]" />
                  </div>
                  <h2 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-[0.4em]">Selection Required</h2>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-4">Pick a support thread from the queue to start orchestrating</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <CategoryManager userRole={user?.role} userSubGroup={user?.subGroup} />
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCreate(false)}></div>
          <div className="relative w-full max-w-lg">
            <TicketCreateForm 
              creatorId={user?.id} 
              onSuccess={() => {
                fetchTickets();
                setShowCreate(false);
              }}
              onClose={() => setShowCreate(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

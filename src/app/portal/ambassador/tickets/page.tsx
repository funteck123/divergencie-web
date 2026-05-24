"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TicketList from "@/components/portal/tickets/TicketList";
import TicketDetail from "@/components/portal/tickets/TicketDetail";
import TicketCreateForm from "@/components/portal/tickets/TicketCreateForm";
import { Plus, History, Inbox, CheckCircle2, HelpCircle, User, UserPlus } from "lucide-react";

export default function AmbassadorTicketsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "created" | "received">("all");
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;
  const isLoaded = status !== "loading" && !!session;

  async function fetchTickets() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets`);
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
    const matchesStatus = statusFilter === "active" ? t.status !== "CLOSED" : t.status === "CLOSED";
    let matchesType = true;
    if (typeFilter === "created") matchesType = t.creatorId === user?.id;
    if (typeFilter === "received") matchesType = t.assigneeId === user?.id;
    return matchesStatus && matchesType;
  });

  if (!isLoaded) return <div className="p-20 text-center font-black uppercase tracking-[0.4em] animate-pulse opacity-50">Synchronizing Session...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight italic">Ambassador <span className="text-[var(--gold)]">Support</span></h1>
          <p className="text-[var(--text-muted)] font-black mt-1 max-w-xl text-[9px] uppercase tracking-[0.2em] leading-loose">Communicate with DC departments regarding campaigns and operations.</p>
        </div>
      </div>

      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)]">
        {[
          { id: "history", label: "My Threads", icon: History },
          { id: "new", label: "New Request", icon: Plus },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === "new") setSelectedTicket(null);
            }}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)]">
              {[
                { id: "active", label: "Active Threads", icon: Inbox },
                { id: "closed", label: "Past Resolutions", icon: CheckCircle2 },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStatusFilter(s.id as any);
                    setSelectedTicket(null);
                  }}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    statusFilter === s.id 
                      ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  <s.icon size={12} />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)]">
              {[
                { id: "all", label: "All Threads", icon: History },
                { id: "created", label: "Sent", icon: User },
                { id: "received", label: "Inbox", icon: UserPlus },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTypeFilter(t.id as any);
                    setSelectedTicket(null);
                  }}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    typeFilter === t.id 
                      ? "bg-white dark:bg-white/10 text-[var(--navy)] dark:text-white shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 min-h-[600px] items-start">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <TicketList 
                  tickets={filtered} 
                  onSelect={setSelectedTicket} 
                  selectedId={selectedTicket?.id} 
                />
              </div>
            </div>
            <div className="lg:col-span-8">
              {selectedTicket ? (
                <TicketDetail 
                  key={selectedTicket.id}
                  ticket={selectedTicket} 
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  onUpdate={fetchTickets}
                />
              ) : (
                <div className="h-full min-h-[500px] bg-[var(--bg-secondary)] dark:bg-white/5 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] flex flex-col items-center justify-center p-20 text-center opacity-30">
                  <Inbox size={48} className="text-[var(--text-muted)] mb-4" />
                  <h2 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Inbox</h2>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Select a thread to view discussion</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "new" && (
        <div className="flex justify-center py-10">
          <TicketCreateForm 
            creatorId={user?.id} 
            onSuccess={() => {
              fetchTickets();
              setActiveTab("history");
              setStatusFilter("active");
              setTypeFilter("created");
            }}
          />
        </div>
      )}
    </div>
  );
}

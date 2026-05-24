"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TicketList from "@/components/portal/tickets/TicketList";
import TicketDetail from "@/components/portal/tickets/TicketDetail";
import TicketCreateForm from "@/components/portal/tickets/TicketCreateForm";
import { Plus, History, Inbox, CheckCircle2, HelpCircle, User, UserPlus } from "lucide-react";

export default function CandidateSupportPage() {
  const { data: session, status } = useSession();
  const [activeQueue, setActiveQueue] = useState<"active" | "processing" | "closed">("active");
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
    const isOwner = t.assigneeId === user?.id;
    const isInvolved = t.creatorId === user?.id || t.history.some((h: any) => h.actorId === user?.id);
    
    let matchesStatus = false;
    if (activeQueue === "active") {
      matchesStatus = t.status !== "CLOSED" && isOwner;
    } else if (activeQueue === "processing") {
      matchesStatus = t.status !== "CLOSED" && !isOwner && isInvolved;
    } else if (activeQueue === "closed") {
      matchesStatus = t.status === "CLOSED";
    }

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
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight italic text-glow">Applicant <span className="text-[var(--gold)]">Support</span></h1>
          <p className="text-[var(--text-muted)] font-black mt-1 max-w-xl text-[9px] uppercase tracking-[0.2em] leading-loose">Contact HR regarding your application status or documentation.</p>
        </div>
        <button 
          onClick={() => setSelectedTicket({ id: "NEW" })}
          className="px-8 py-4 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
        >
          <Plus size={20} /> New Ticket
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)]">
          {[
            { id: "active", label: "Action Required", icon: Inbox },
            { id: "processing", label: "Waiting for Staff", icon: History },
            { id: "closed", label: "Past Resolutions", icon: CheckCircle2 },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveQueue(s.id as any);
                setSelectedTicket(null);
              }}
              className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeQueue === s.id 
                  ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
              }`}
            >
              <s.icon size={14} />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 min-h-[600px] items-start">
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-full border border-[var(--border-subtle)]">
              {[
                { id: "all", label: "All", icon: History },
                { id: "created", label: "Sent", icon: User },
                { id: "received", label: "Inbox", icon: UserPlus },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTypeFilter(t.id as any);
                    setSelectedTicket(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    typeFilter === t.id 
                      ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>
            <TicketList 
              tickets={filtered} 
              onSelect={setSelectedTicket} 
              selectedId={selectedTicket?.id} 
            />
          </div>
        </div>
        <div className="lg:col-span-8">
          {selectedTicket && selectedTicket.id !== "NEW" ? (
            <TicketDetail 
              key={selectedTicket.id}
              ticket={selectedTicket} 
              currentUserId={user?.id}
              currentUserRole={user?.role}
              onUpdate={fetchTickets}
            />
          ) : selectedTicket?.id === "NEW" ? (
            <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-[3rem] p-12">
               <TicketCreateForm 
                creatorId={user?.id} 
                onSuccess={() => {
                  fetchTickets();
                  setSelectedTicket(null);
                  setActiveQueue("processing"); // Usually waiting for staff after creation
                }}
                onClose={() => setSelectedTicket(null)}
              />
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-[var(--bg-secondary)] dark:bg-white/5 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] flex flex-col items-center justify-center p-20 text-center opacity-30">
              <Inbox size={48} className="text-[var(--text-muted)] mb-4" />
              <h2 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Select a Thread</h2>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">View discussion or action required items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

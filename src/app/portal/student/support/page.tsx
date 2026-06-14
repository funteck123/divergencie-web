"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import TicketList from "@/components/portal/tickets/TicketList";
import TicketDetail from "@/components/portal/tickets/TicketDetail";
import TicketCreateForm from "@/components/portal/tickets/TicketCreateForm";
import { getStudentFlags } from "@/lib/actions/tickets";
import { 
  Plus, 
  History, 
  HelpCircle, 
  PhoneCall, 
  Inbox, 
  CheckCircle2, 
  User, 
  UserPlus,
  AlertCircle
} from "lucide-react";

export default function StudentSupportPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [activeQueue, setActiveQueue] = useState<"active" | "processing" | "closed">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "created" | "received">("all");
  const [tickets, setTickets] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;
  const isLoaded = status !== "loading" && !!session;

  async function fetchTickets() {
    if (!user?.id) return;
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

  async function fetchFlags() {
    if (!user?.email) return;
    try {
      const data = await getStudentFlags(user.email);
      setFlags(data);
    } catch (err) {
      console.error("Failed to fetch student warning flags:", err);
    }
  }

  useEffect(() => {
    if (isLoaded) {
      fetchTickets();
      fetchFlags();
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight italic">Support <span className="text-[var(--gold)]">Protocol</span></h1>
          <p className="text-[var(--text-muted)] font-black mt-1 max-w-xl text-[9px] uppercase tracking-[0.2em] leading-loose">Academics, technical issues, or administrative assistance.</p>
        </div>
      </div>

      {/* Warning Flags Banner */}
      {flags.length > 0 && (
        <div className="space-y-3">
          {flags.map((flag: any) => (
            <div 
              key={flag.id} 
              className="p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-3 duration-300 shadow-sm"
            >
              <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" size={18} />
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-rose-800 dark:text-rose-300 tracking-wider">
                  Warning Flag: {flag.flagType.replace(/_/g, " ")}
                </h4>
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400 leading-relaxed">
                  {flag.notes || "An administrative alert is active on your profile. Please contact the PR/Support team."}
                </p>
                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1.5">
                  Flagged Date: {new Date(flag.flaggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)] dark:border-white/10">
        {[
          { id: "history", label: "My Discussions", icon: History },
          { id: "new", label: "New Ticket", icon: Plus },
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
                : "text-[var(--text-muted)] dark:text-gray-400 hover:text-[var(--navy)] dark:hover:text-white"
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
            {/* Status Sub-Tabs */}
            <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)] dark:border-white/10">
              {[
                { id: "active", label: "Action Required", icon: Inbox },
                { id: "processing", label: "Waiting for Staff", icon: History },
                { id: "closed", label: "History", icon: CheckCircle2 },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveQueue(s.id as any);
                    setSelectedTicket(null);
                  }}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    activeQueue === s.id 
                      ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                      : "text-[var(--text-muted)] dark:text-gray-400 hover:text-[var(--navy)] dark:hover:text-white"
                  }`}
                >
                  <s.icon size={12} />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Type Sub-Tabs */}
            <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit border border-[var(--border-subtle)] dark:border-white/10">
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
                      : "text-[var(--text-muted)] dark:text-gray-400 hover:text-[var(--navy)] dark:hover:text-white"
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
                <div className="h-full min-h-[500px] bg-[var(--bg-secondary)] dark:bg-white/5 border border-dashed border-[var(--border-subtle)] dark:border-white/10 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center opacity-30">
                  <HelpCircle size={48} className="text-[var(--text-muted)] mb-4" />
                  <h2 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">Discussion View</h2>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Select a thread to view the full discussion</p>
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
              setActiveQueue("processing");
              setTypeFilter("created");
            }}
          />
        </div>
      )}

      {/* Emergency Contact */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shrink-0 shadow-lg">
            <PhoneCall size={24} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">Immediate Assistance Needed?</h4>
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight mt-1">WhatsApp our team for 2-hour response on session-critical blockers.</p>
          </div>
        </div>
        <a href="https://wa.me/919650675507" target="_blank" className="px-8 py-4 bg-[#25D366] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20">
          Connect via WhatsApp
        </a>
      </div>
    </div>
  );
}

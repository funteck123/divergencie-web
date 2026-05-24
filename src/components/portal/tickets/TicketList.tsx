"use client";

import { Clock, MessageCircle, AlertCircle, ChevronRight, User, Inbox } from "lucide-react";
import { useSession } from "next-auth/react";

interface Ticket {
  id: string;
  displayId: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  assigneeId?: string | null;
  creator: { name: string; email: string };
  assignee?: { name: string; email: string } | null;
  _count?: { messages: number };
}

interface Props {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  selectedId?: string;
}

export default function TicketList({ tickets, onSelect, selectedId }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  return (
    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
      {tickets.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-3xl opacity-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">No tickets found</p>
        </div>
      ) : (
        tickets.map((t) => {
          const isIncoming = t.assigneeId === userId;
          
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`w-full text-left p-5 border rounded-2xl transition-all group relative overflow-hidden ${
                selectedId === t.id 
                  ? "bg-[var(--navy)] border-[var(--navy)] text-white shadow-xl translate-x-2" 
                  : "bg-white dark:bg-white/5 border-[var(--border-subtle)] hover:border-[var(--gold)]"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    t.status === "OPEN" ? "bg-emerald-500" : 
                    t.status === "PROCESSING" ? "bg-blue-500" : "bg-gray-400"
                  } ${(t.status === "OPEN" || t.status === "PROCESSING") ? "animate-pulse" : ""}`}></span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                    selectedId === t.id ? "text-white/60" : "text-[var(--text-muted)]"
                  }`}>
                    #{t.displayId} · {t.department} · {t.status}
                  </span>
                  {isIncoming && (
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest flex items-center gap-1 ${
                      selectedId === t.id ? "bg-[var(--gold)] text-black" : "bg-blue-600 text-white"
                    }`}>
                      <Inbox size={8} /> Inbox
                    </span>
                  )}
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                  t.priority === "HIGH" ? "bg-red-500 text-white" : 
                  selectedId === t.id ? "bg-white/10 text-white" : "bg-gray-100 dark:bg-white/10"
                }`}>
                  {t.priority}
                </div>
              </div>

              <h3 className={`text-sm font-black uppercase tracking-tight line-clamp-1 mb-2 ${
                selectedId === t.id ? "text-white" : "text-[var(--navy)] dark:text-white group-hover:text-[var(--gold)]"
              }`}>
                {t.title}
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className={selectedId === t.id ? "text-white/40" : "text-[var(--text-muted)]"} />
                    <span className={`text-[9px] font-bold ${
                      selectedId === t.id ? "text-white/60" : "text-[var(--text-muted)]"
                    }`}>{t.creator?.name} <span className="opacity-50 lowercase font-medium">({t.creator?.email})</span></span>
                  </div>
                  {t._count && t._count.messages > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={12} className={selectedId === t.id ? "text-white/40" : "text-[var(--text-muted)]"} />
                      <span className={`text-[9px] font-bold ${
                        selectedId === t.id ? "text-white/60" : "text-[var(--text-muted)]"
                      }`}>{t._count.messages}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={14} className={`transition-transform group-hover:translate-x-1 ${
                  selectedId === t.id ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
                }`} />
              </div>

              {selectedId === t.id && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)] opacity-5 -mr-16 -mt-16 rounded-full blur-2xl"></div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}


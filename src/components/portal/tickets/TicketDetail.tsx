"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Send, User, Clock, Shield, Forward, CheckCircle2, RotateCcw, AlertCircle, UserPlus, Building2, ChevronRight, Link as LinkIcon } from "lucide-react";
import { getStaffMembers, getExternalUsers } from "@/lib/actions/users";

interface Message {
  id: string;
  body: string;
  isInternal: boolean;
  attachmentLink: string | null;
  createdAt: string;
  sender: { name: string; role: string };
}

interface History {
  id: string;
  action: string;
  meta: string | null;
  createdAt: string;
  actorId: string;
  actor: { name: string };
}

interface Ticket {
  id: string;
  displayId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  assigneeId?: string | null;
  originalDept: string | null;
  category: string | null;
  attachmentLink: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string; role: string };
  assignee?: { id: string; name: string; email: string } | null;
  messages: Message[];
  history: History[];
}

interface Props {
  ticket: Ticket;
  currentUserId: string;
  currentUserRole: string;
  currentSubGroup?: string;
  onUpdate: () => void;
}

export default function TicketDetail({ ticket, currentUserId, currentUserRole, currentSubGroup, onUpdate }: Props) {
  const { data: session, status } = useSession();
  const [reply, setReply] = useState("");
  const [attachmentLink, setAttachmentLink] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [external, setExternal] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [fwdDept, setFwdDept] = useState("");
  const [fwdUser, setFwdUser] = useState("");
  const [allPermissions, setAllPermissions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/management/permissions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllPermissions(data);
      });
  }, []);

  const isStaff = currentUserRole === "staff" || currentUserRole === "management";
  const user = session?.user as any;
  const isSup = (isStaff && user?.supervisor) || currentUserRole === "management";
  const userDept = user?.dept;
  const deptPerm = allPermissions.find(p => p.department === userDept);

  useEffect(() => {
    if (isStaff) {
      Promise.all([getStaffMembers(), getExternalUsers()])
        .then(([staff, external]) => { setStaff(staff); setExternal(external); });
    }
  }, [isStaff]);

  if (status === "loading") return null;
  if (!session) return null;

  async function handleAction(action: string, data: any = {}, body?: string, isInternal?: boolean, attachmentLink?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action, 
          ...data,
          body,
          isInternal,
          attachmentLink
        }),
      });
      if (res.ok) {
        setReply("");
        setAttachmentLink("");
        onUpdate();
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
    return false;
  }

  async function handleSendReply() {
    if (!reply.trim()) return false;
    return await handleAction("REPLY", {}, reply, isInternal, attachmentLink);
  }

  const filteredStaff = staff.filter(s => {
    if (s.id === currentUserId) return false;
    if (currentUserRole === "management") return true;
    return s.dept === userDept;
  });

  // Calculate if ticket was forwarded
  const wasForwarded = (ticket.history || []).some(h => h.action === "FORWARDED");
  const lastForward = (ticket.history || []).find(h => h.action === "FORWARDED");

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
      {/* Detail Header */}
      <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-[var(--navy)] text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                #{ticket.displayId}
              </span>
              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                ticket.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : 
                ticket.status === "PROCESSING" ? "bg-blue-100 text-blue-700" : 
                "bg-gray-100 text-gray-700"
              }`}>
                {ticket.status === "OPEN" ? "Active" : ticket.status === "PROCESSING" ? "Waiting / Pending" : ticket.status}
              </span>
              <span className="text-[10px] font-bold text-[var(--text-muted)] italic">
                Created {new Date(ticket.createdAt).toLocaleString()}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-4 leading-tight">
              {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-black font-black text-xs uppercase">
                  {ticket.creator?.name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">Source: {ticket.creator?.name}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] lowercase italic opacity-60">{ticket.creator?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-6">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xs uppercase">
                  <Building2 size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">Target: {ticket.department || "General Support"}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">Current Dept</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-6">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xs uppercase shadow-lg">
                  {ticket.assignee ? ticket.assignee.name[0] : "?"}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">
                    Assigned: {ticket.assignee?.name || "Waiting for Supervisor"}
                  </p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] lowercase italic opacity-60">
                    {ticket.assignee?.email || "No assignee"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-6 opacity-60">
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-black text-xs uppercase">
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">Original: {ticket.originalDept || ticket.department || "PR"}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Root Target</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isSup && (
              <div className="relative">
                <button 
                  onClick={() => { setShowAssign(!showAssign); setShowForward(false); }}
                  className="px-4 py-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-2"
                >
                  <UserPlus size={14} /> {showAssign ? "Close" : "Assign To"}
                </button>
                {showAssign && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredStaff.length === 0 ? (
                      <p className="p-4 text-[9px] font-black uppercase text-center text-[var(--text-muted)]">No eligible members found</p>
                    ) : (
                      filteredStaff.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { handleAction("ASSIGN", { assigneeId: s.id }); setShowAssign(false); }}
                          className="w-full text-left p-3 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-xl transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase text-[var(--navy)] dark:text-white">{s.name}</p>
                              <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{s.dept || "Management"} · {s.role}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                              s.supervisor ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {s.supervisor ? "Supervisor" : "Member"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {ticket.status === "CLOSED" && (
              <button onClick={() => handleAction("REOPEN")} className="px-4 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all flex items-center gap-2">
                <RotateCcw size={14} /> Reopen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Sequence */}
      <div className="px-8 py-4 bg-white/40 dark:bg-white/5 border-b border-[var(--border-subtle)] flex items-center gap-4 overflow-x-auto custom-scrollbar no-scrollbar">
        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] shrink-0">Sequence:</span>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          {/* First: The Source */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg shrink-0">
            <span className="text-[9px] font-black uppercase text-[var(--navy)] dark:text-white">{ticket.creator?.name}</span>
          </div>

          {/* Middle: The Reply Chain Actors */}
          {(ticket.history || [])
            .filter(h => h.action === "FORWARDED" || h.action === "HANDED_BACK" || h.action === "ASSIGNED" || h.action === "REPLIED" || h.action === "REPLIED_AND_RETURNED")
            .slice()
            .reverse()
            .map((h, i) => (
              <div key={h.id} className="flex items-center gap-3 shrink-0">
                <ChevronRight size={12} className="text-[var(--text-muted)]" />
                <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${
                  h.action === "HANDED_BACK" || h.action.includes("REPLIED") ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
                }`}>
                  <span className={`text-[9px] font-black uppercase ${
                    h.action === "HANDED_BACK" || h.action.includes("REPLIED") ? "text-amber-600" : "text-blue-600"
                  }`}>
                    {h.actor?.name}
                  </span>
                </div>
              </div>
            ))}

          {/* Last: The Closer (if closed) */}
          {ticket.status === "CLOSED" && (ticket.history || []).find(h => h.action === "CLOSED") && (
            <div className="flex items-center gap-3 shrink-0">
              <ChevronRight size={12} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 border border-emerald-600 rounded-lg">
                <span className="text-[9px] font-black uppercase text-white">{(ticket.history || []).find(h => h.action === "CLOSED")?.actor?.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {/* Original Post */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--gold)] flex items-center justify-center text-black font-black uppercase shrink-0">
            {ticket.creator?.name?.[0] || "?"}
          </div>
          <div className="max-w-[80%] space-y-2">
            <div className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl rounded-tl-none shadow-sm">
              <p className="text-sm font-medium text-[var(--navy)] dark:text-white leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
              {ticket.attachmentLink && (
                <a href={ticket.attachmentLink} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">
                  <AlertCircle size={14} /> View Attachment (GDrive)
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {(ticket.messages || []).map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.sender?.name === ticket.creator?.name ? "" : "flex-row-reverse"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black uppercase shrink-0 ${
              m.isInternal ? "bg-amber-500" : m.sender?.name === ticket.creator?.name ? "bg-[var(--gold)] text-black" : "bg-blue-500"
            }`}>
              {m.sender?.name?.[0] || "?"}
            </div>
            <div className={`max-w-[80%] space-y-2 ${m.sender?.name === ticket.creator?.name ? "" : "text-right"}`}>
              <div className={`p-6 border rounded-2xl shadow-sm ${
                m.sender?.name === ticket.creator?.name 
                  ? "bg-white dark:bg-white/5 border-[var(--border-subtle)] rounded-tl-none" 
                  : m.isInternal 
                    ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/20 rounded-tr-none"
                    : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/20 rounded-tr-none"
              }`}>
                {m.isInternal && (
                  <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-amber-600 mb-2">
                    <Shield size={10} /> Internal Staff Note
                  </div>
                )}
                <p className="text-sm font-medium text-[var(--navy)] dark:text-white leading-relaxed whitespace-pre-wrap text-left">
                  {m.body}
                </p>
              </div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                {m.sender?.name} · {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {(() => {
        const isAssignee = ticket.assigneeId === currentUserId;
        const canReply = currentUserRole === "management" || 
                        isAssignee || 
                        (!ticket.assigneeId && isSup && ticket.department === userDept);

        if (!canReply) {
          return (
            <div className="p-8 border-t border-[var(--border-subtle)] bg-gray-50 dark:bg-white/5 flex items-center justify-center gap-3">
              <AlertCircle size={16} className="text-[var(--text-muted)]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
                This thread is currently locked.<br/>
                Waiting for {ticket.assignee?.name || ticket.department || "the other party"} to respond.
              </p>
            </div>
          );
        }

        return (
          <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="space-y-4">
          {isStaff && (
            <div className="flex items-center gap-6 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isInternal} onChange={() => setIsInternal(false)} className="hidden" />
                <div className={`w-3 h-3 rounded-full border-2 ${!isInternal ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--border-subtle)]"}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Official Reply</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isInternal} onChange={() => setIsInternal(true)} className="hidden" />
                <div className={`w-3 h-3 rounded-full border-2 ${isInternal ? "border-amber-500 bg-amber-500" : "border-[var(--border-subtle)]"}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Internal Note</span>
              </label>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {/* Drive Link at the Top */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--gold)]">
                <LinkIcon size={14} />
              </div>
              <input
                type="text"
                value={attachmentLink}
                onChange={(e) => setAttachmentLink(e.target.value)}
                placeholder="G-Drive Attachment Link (Optional)"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] transition-all"
              />
            </div>

            {/* Response Box in the Middle */}
            <textarea 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your response..."
              rows={4}
              className="w-full p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--gold)] transition-all resize-none shadow-inner"
            />

            {/* Buttons Spaced Below */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                {isStaff && !isInternal && ticket.status !== "CLOSED" && (
                  <>
                    {(wasForwarded || ticket.department !== ticket.originalDept) && (
                      <button 
                        onClick={() => handleAction("HANDBACK", {}, reply, isInternal, attachmentLink)}
                        className="px-6 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl flex items-center gap-2"
                      >
                        Reply & Hand Back
                      </button>
                    )}
                    <button 
                      onClick={() => setShowForward(true)}
                      className="px-6 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl flex items-center gap-2"
                    >
                      Reply & Forward
                    </button>
                    <button 
                      onClick={() => handleAction("CLOSE", {}, reply, isInternal, attachmentLink)}
                      className="px-6 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-700 transition-all shadow-xl flex items-center gap-2"
                    >
                      Reply & Close
                    </button>
                  </>
                )}
              </div>
              
              <button 
                onClick={async () => {
                  const ok = await handleSendReply();
                  if (ok) onUpdate();
                }}
                disabled={loading || !reply.trim()}
                className="px-8 py-4 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50"
              >
                {isInternal ? "Save Note" : "Send Reply"}
              </button>
            </div>
          </div>

          {showForward && isStaff && (
            <div className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Target Department</label>
                  <select 
                    value={fwdDept}
                    onChange={(e) => { setFwdDept(e.target.value); setFwdUser(""); }}
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase"
                  >
                    <option value="">-- Select --</option>
                    <optgroup label="Internal">
                      {["PR", "IT", "HR", "Finance", "Marketing", "Management"].filter(d => {
                        if (currentUserRole === "management") return true;
                        if (!deptPerm) return d === userDept;
                        if (d === "PR") return deptPerm.canTargetPR;
                        if (d === "IT") return deptPerm.canTargetIT;
                        if (d === "HR") return deptPerm.canTargetHR;
                        if (d === "Finance") return deptPerm.canTargetFinance;
                        if (d === "Marketing") return deptPerm.canTargetMarketing;
                        if (d === "Management") return deptPerm.canTargetManagement;
                        return d === userDept;
                      }).map(d => <option key={d} value={d}>{d}</option>)}
                    </optgroup>
                    <optgroup label="External">
                      {["student", "teacher", "parent", "ambassador", "candidate"].filter(r => {
                        if (currentUserRole === "management") return true;
                        if (!deptPerm) return false;
                        if (r === "student") return deptPerm.canTargetStudent;
                        if (r === "parent") return deptPerm.canTargetParent;
                        if (r === "teacher") return deptPerm.canTargetTeacher;
                        if (r === "ambassador") return deptPerm.canTargetAmbassador;
                        if (r === "candidate") return deptPerm.canTargetCandidate;
                        return false;
                      }).map(r => <option key={r} value={`EXT:${r}`}>{r}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Assign Individual</label>
                  <select 
                    value={fwdUser}
                    onChange={(e) => setFwdUser(e.target.value)}
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase"
                  >
                    <option value="">-- Let Dept Handle --</option>
                    {(fwdDept.startsWith("EXT:") 
                      ? external.filter(u => u.role === fwdDept.split(":")[1])
                      : staff.filter(s => (fwdDept === "Management" ? s.role === "management" : s.dept === fwdDept))
                    ).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <button 
                onClick={async () => {
                  if (!fwdDept) return;
                  const ok = await handleAction("FORWARD", { department: fwdDept, assigneeId: fwdUser }, reply, isInternal, attachmentLink);
                  if (ok) {
                    setShowForward(false);
                    setFwdDept("");
                    setFwdUser("");
                  }
                }}
                disabled={!fwdDept || loading}
                className="w-full mt-4 py-4 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Processing..." : "Execute Forward"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
      })()}
    </div>
  );
}

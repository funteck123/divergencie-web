"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, FileText, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { getClaimsForApproval, approveClaim, rejectClaim } from "@/lib/actions/finance";
import { createPaycheck } from "@/lib/actions/claims";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PENDING: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-purple-100 text-purple-700",
};

export default function FinanceClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setClaims(await getClaimsForApproval()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await approveClaim(id);
      const claim = claims.find((c: any) => c.id === id);
      if (claim) {
        await createPaycheck({
          claimId: id,
          recipientId: claim.userId ?? claim.user?.id ?? id,
          month: claim.month ?? new Date().toISOString().slice(0, 7),
          subtotal: claim.amount ?? 0,
          deductionsApplied: 0,
        });
      }
      await load();
    } finally { setActing(null); }
  };

  const handleReject = async (id: string) => {
    setActing(id);
    try {
      await rejectClaim(id);
      await load();
    } finally { setActing(null); setRejecting(null); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--bg-secondary)]" />)}
    </div>
  );

  const pending = claims.filter(c => c.status === "SUBMITTED");
  const rest = claims.filter(c => c.status !== "SUBMITTED");

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="text-xs font-black text-[var(--gold)] uppercase tracking-widest mb-1">Finance</p>
        <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Claims Approval</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Review and approve teacher payment claims.</p>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{pending.length} claim{pending.length !== 1 ? "s" : ""} pending approval</p>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Pending ({pending.length})</p>
        {pending.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-[var(--text-muted)] text-sm">All caught up — no pending claims.</p>
          </div>
        ) : pending.map((claim: any) => (
          <ClaimCard key={claim.id} claim={claim} acting={acting} rejecting={rejecting} rejectReason={rejectReason}
            expanded={expanded} setExpanded={setExpanded} setRejecting={setRejecting}
            setRejectReason={setRejectReason} onApprove={handleApprove} onReject={handleReject} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">History ({rest.length})</p>
          {rest.map((claim: any) => (
            <ClaimCard key={claim.id} claim={claim} acting={acting} rejecting={rejecting} rejectReason={rejectReason}
              expanded={expanded} setExpanded={setExpanded} setRejecting={setRejecting}
              setRejectReason={setRejectReason} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim, acting, rejecting, rejectReason, expanded, setExpanded, setRejecting, setRejectReason, onApprove, onReject }: any) {
  const isExpanded = expanded === claim.id;
  const isPending = claim.status === "SUBMITTED";

  return (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[claim.status] ?? "bg-gray-100 text-gray-600"}`}>{claim.status}</span>
              <span className="text-xs font-bold text-[var(--navy)] dark:text-white">{claim.claimantType ?? "TEACHER"}</span>
              {claim.hours && <span className="text-xs text-[var(--text-muted)]">{claim.hours}h</span>}
              {claim.sessions && <span className="text-xs text-[var(--text-muted)]">{claim.sessions} sessions</span>}
              {claim.rateApplied && <span className="text-xs text-[var(--text-muted)]">@ £{claim.rateApplied}/hr</span>}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {claim.user?.name ?? "—"} · {claim.user?.email ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {claim.history?.length > 0 && (
              <button onClick={() => setExpanded(isExpanded ? null : claim.id)}
                className="text-xs text-[var(--text-muted)] flex items-center gap-1 hover:text-[var(--gold)] transition-colors">
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
            {isPending && (
              <>
                <button onClick={() => onApprove(claim.id)} disabled={!!acting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  {acting === claim.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Approve
                </button>
                <button onClick={() => setRejecting(rejecting === claim.id ? null : claim.id)} disabled={!!acting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors">
                  <XCircle size={10} /> Reject
                </button>
              </>
            )}
          </div>
        </div>

        {rejecting === claim.id && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl space-y-3">
            <textarea value={rejectReason[claim.id] ?? ""} onChange={e => setRejectReason((r: any) => ({ ...r, [claim.id]: e.target.value }))}
              placeholder="Reason for rejection..." rows={2}
              className="w-full p-2.5 text-sm border border-red-200 dark:border-red-900/30 bg-transparent rounded-lg outline-none resize-none" />
            <button onClick={() => onReject(claim.id)} disabled={!!acting}
              className="px-4 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              Confirm Reject
            </button>
          </div>
        )}

        {isExpanded && claim.history?.length > 0 && (
          <div className="mt-4 border-l-2 border-[var(--gold)]/30 pl-3 space-y-1.5">
            {claim.history.map((h: any) => (
              <div key={h.id} className="text-xs text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--navy)] dark:text-white">{h.fromStatus} → {h.toStatus}</span>
                <span className="ml-2">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                {h.reason && <span className="ml-2 italic">"{h.reason}"</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {claim.paychecks?.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 px-5 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Paychecks</p>
          {claim.paychecks.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-[var(--navy)] dark:text-white font-semibold">£{p.netAmount}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

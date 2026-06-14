"use client";

import { Clock, ShieldAlert, MessageCircle, ArrowLeft } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export default function AwaitingApprovalPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-3xl p-12 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Clock size={40} className="text-[var(--gold)]" />
        </div>
        
        <h1 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-4">Account Pending Approval</h1>
        
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl mb-8">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-tight">
            Our Finance department is currently verifying your advance payment and registration details.
          </p>
        </div>

        <p className="text-sm text-[var(--text-muted)] font-medium mb-12 leading-relaxed">
          This usually takes 12–24 hours. You will receive a WhatsApp notification once your portal is fully activated.
        </p>

        <div className="space-y-4">
          <a 
            href="https://wa.me/919650675507" 
            target="_blank"
            className="w-full py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle size={14} /> Contact Finance (WhatsApp)
          </a>
          
          <button 
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-center gap-2 opacity-40">
            <ShieldAlert size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Finance Pre-Check Gate v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

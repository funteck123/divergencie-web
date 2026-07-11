"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, MessageCircle } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-red-500/10 rotate-3 group-hover:rotate-0 transition-transform">
            <ShieldAlert size={48} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--gold)] rounded-full border-4 border-[var(--bg-primary)] animate-pulse"></div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter italic">Access Denied</h1>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Restricted Protocol Zone</p>
        </div>

        <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
          You do not have the required security clearances to enter this sector of the DivergenCIE Command Center. 
        </p>

        <div className="pt-8 flex flex-col gap-3">
          <Link 
            href="/auth/login"
            className="w-full py-4 bg-[var(--navy)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-[var(--navy)]/20"
          >
            <ArrowLeft size={14} /> Return to Base
          </Link>
          <a 
            href="https://wa.me/919650675507" 
            target="_blank"
            className="w-full py-4 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--navy)] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-[var(--gold)] border border-transparent transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle size={14} /> Contact HQ Support
          </a>
        </div>

        <div className="pt-12 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-30">
          Incident Logged · IP Tracked · Security Audit v4.0
        </div>
      </div>
    </div>
  );
}

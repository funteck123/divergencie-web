"use client";

import Link from "next/link";
import { Search, Map, Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="relative">
          <div className="text-[120px] font-black text-[var(--navy)] dark:text-white opacity-10 leading-none select-none italic">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-[var(--gold)] text-black rounded-full flex items-center justify-center shadow-2xl shadow-[var(--gold)]/20 animate-bounce">
              <Compass size={40} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tighter">Sector Not Found</h1>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Coordinate Error in Hypergrid</p>
        </div>

        <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed italic">
          "Not all who wander are lost, but this page definitely is."
        </p>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Link 
            href="/portal"
            className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--gold)] transition-all group"
          >
            <Home size={24} className="mx-auto text-[var(--gold)] mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Dashboard</span>
          </Link>
          <Link 
            href="/auth/login"
            className="p-6 bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--gold)] transition-all group"
          >
            <Map size={24} className="mx-auto text-[var(--gold)] mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Login Hub</span>
          </Link>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => window.history.back()}
            className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--gold)] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mx-auto"
          >
            <Search size={12} /> Go Back One Sector
          </button>
        </div>
      </div>
    </div>
  );
}

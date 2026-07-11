"use client";

import { useSession } from "@/lib/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, User, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";


// Separated into its own component so useSearchParams is inside a Suspense boundary
function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== query) setQuery(q || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) params.set("q", query);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="hidden md:flex items-center gap-4 text-[var(--text-muted)]">
      <Search size={18} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search subjects, tickets, or users..."
        className="bg-transparent border-none outline-none text-sm w-64 font-medium focus:text-[var(--navy)] dark:focus:text-white transition-colors"
      />
    </form>
  );
}

export function Topbar() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const user = session?.user as any;

  return (
    <>
      <header className="h-16 border-b border-[var(--border-subtle)] bg-white/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 md:hidden hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg transition-all"
          >
            <Menu size={20} className="text-[var(--navy)] dark:text-white" />
          </button>
          <Suspense fallback={<div className="hidden md:flex items-center gap-4 text-[var(--text-muted)]"><Search size={18} /><span className="text-sm w-64 font-medium opacity-40">Search...</span></div>}>
            <TopbarSearch />
          </Suspense>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <ThemeToggle />
          
          <NotificationBell />

          <div className="hidden md:block h-8 w-px bg-[var(--border-subtle)]"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white leading-none">
                {user?.name || "User"}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                {user?.dept && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-subtle)] px-1 rounded-sm">
                    {user.dept}
                  </span>
                )}
                <RoleBadge role={user?.role || "Student"} />
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--gold-light-bg)] dark:bg-white/5 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--gold)]">
              <User size={18} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-[70] md:hidden"
            >
              <Sidebar onMobileClose={() => setIsMobileMenuOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

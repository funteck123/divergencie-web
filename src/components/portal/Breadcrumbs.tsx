"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter((s) => s && s !== "portal");

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
      <Link href="/portal" className="hover:text-[var(--gold)] transition-colors flex items-center gap-1">
        <Home size={12} />
        Portal
      </Link>
      
      {segments.map((segment, index) => {
        const href = `/portal/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = segment.replace(/-/g, " ");

        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight size={10} className="opacity-30" />
            {isLast ? (
              <span className="text-[var(--navy)] dark:text-white">{label}</span>
            ) : (
              <Link href={href} className="hover:text-[var(--gold)] transition-colors">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

"use client";

import { Sidebar } from "@/components/portal/Sidebar";
import { Topbar } from "@/components/portal/Topbar";
import { Breadcrumbs } from "@/components/portal/Breadcrumbs";
import * as motion from "framer-motion/client";
import { MotionConfig } from "framer-motion";
import { APP_CONFIG } from "@/lib/config";
import { useSession } from "@/lib/auth-client";
import { Suspense } from "react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const hasRole = !!(session?.user as any)?.role;

  return (
    <MotionConfig reducedMotion={APP_CONFIG.PERFORMANCE_MODE ? "always" : "never"}>
      <div className="flex min-h-screen bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        <Suspense fallback={<div className="fixed inset-0 bg-[var(--navy)] z-[100] flex items-center justify-center text-[var(--gold)] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Portal...</div>}>
          <Sidebar />
          <div className={`flex-1 ${hasRole ? 'ml-64' : ''} flex flex-col transition-all duration-300`}>
            <Topbar />
            <motion.main 
              key="portal-main"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 p-8"
            >
              <Breadcrumbs />
              {children}
            </motion.main>
          </div>
        </Suspense>
      </div>
    </MotionConfig>
  );
}

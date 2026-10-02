"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppToaster } from "@/ui2/components/AppToaster";

/** What every portal page needs around the shell: URL state and toasts. (Management gets the same through its own layout.) */
export function PortalChrome({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      {children}
      <AppToaster />
    </NuqsAdapter>
  );
}

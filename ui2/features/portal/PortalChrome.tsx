"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

/** What every portal page needs around the shell: URL state and toasts. (Management gets the same through its own layout.) */
export function PortalChrome({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </NuqsAdapter>
  );
}

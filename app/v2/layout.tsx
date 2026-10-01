import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/ui2/queries/QueryProvider";
import "@/ui2/styles/tokens.css";
import "@/ui2/styles/base.css";

// The experimental new UI (TKT-0322). Opt-in Beta, never indexed. Everything is scoped under .u2.
export const metadata: Metadata = {
  title: "DivergenCIE (new UI, Beta)",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="u2">
      <QueryProvider>{children}</QueryProvider>
    </div>
  );
}

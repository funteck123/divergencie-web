import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/ui2/styles/tokens.css";
import "@/ui2/styles/base.css";
import "@/ui2/styles/utilities.css";
import "@/ui2/styles/shared.css";

// 24 Nov 2026: the public time picker (no login, nothing stored). Also served at schedule.divergencie.co.uk.
export const metadata: Metadata = {
  title: "Choose your class times | DivergenCIE Coaching",
  description: "Pick the days and times that suit you, copy a ready message and send it to DivergenCIE on WhatsApp.",
  robots: { index: false, follow: false },
};

export default function SlotsLayout({ children }: { children: ReactNode }) {
  return <div className="u2 u2-page">{children}</div>;
}

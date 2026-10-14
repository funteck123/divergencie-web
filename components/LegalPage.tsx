import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";

export const COMPANY = "DivergenCIE Educational Consultancy Pvt Ltd";
export const CONTACT_EMAIL = "team@divergencie.co.uk";
export const CONTACT_WHATSAPP = "+91 96506 75507";
export const LEGAL_UPDATED = "14 October 2026";

/** One titled block of a legal page. Plain text only, so the page stays easy to read and to review. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white mb-4">{title}</h2>
      <div className="space-y-4 text-base leading-relaxed text-[var(--text-secondary,#374151)] dark:text-white/80">{children}</div>
    </section>
  );
}

export default function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      <section className="pt-48 pb-16 bg-[var(--navy)] text-white text-center">
        <div className="container mx-auto px-4">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">{eyebrow}</p>
          <h1 className="text-5xl md:text-7xl font-black mb-6 uppercase leading-tight">{title}</h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">{intro}</p>
          <p className="mt-6 text-sm text-white/60">Last updated {LEGAL_UPDATED}</p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">{children}</div>
      </section>
      <Footer />
    </main>
  );
}

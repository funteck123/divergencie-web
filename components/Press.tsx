"use client";

import { Newspaper, Radio } from "lucide-react";

// TKT-0179: replaced fabricated logos with real outlets, confirmed via
// web search (2026-09-01) to actually cover Cambridge Outstanding
// Learner Award / world-topper / country-topper results -- the same
// category of achievement DivergenCIE students' results fall under.
const pressLogos = [
  { name: "Saudi Gazette", icon: <Newspaper size={20} /> },
  { name: "ANI News", icon: <Radio size={20} /> },
  { name: "The Tribune (India)", icon: <Newspaper size={20} /> },
];

export default function Press() {
  return (
    <section className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
            THE RECOGNITION
          </p>
          <h2 className="text-5xl sm:text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-6">
            REAL RESULTS,<br /><span className="text-[var(--gold)]">REAL COVERAGE.</span>
          </h2>
          <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Outlets that cover Cambridge world & country topper results.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {pressLogos.map((press, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-4 p-6 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[6px_6px_0px_var(--navy)] transition-all group"
            >
              <div className="text-[var(--gold)]">
                {press.icon}
              </div>
              <span className="text-sm font-black uppercase tracking-wider leading-tight">
                {press.name}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest italic opacity-50">
          * These outlets cover Cambridge topper achievements, not DivergenCIE specifically.
        </p>
      </div>
    </section>
  );
}

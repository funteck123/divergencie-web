"use client";

import { Landmark, Plus, CheckCircle2 } from "lucide-react";

// TKT-0165/0176: the previous version showed a specific pass-rate % per
// subject (96%, 92%, ...) with no real data behind any of them -- dropped
// in favor of real, checkable claims about the actual process.
const methodPoints = [
  "Every topic mapped to the real exam board's mark scheme",
  "Drilled with real past papers, not generic practice questions",
  "Marked the way examiners actually mark, not just right or wrong",
  "Every session recorded, so nothing gets missed",
];

const unis = [
  "University of Oxford",
  "University of Cambridge",
  "LSE",
  "Imperial College London",
  "UCL",
  "Durham University",
  "University of Warwick",
  "University of Edinburgh",
  "King's College London",
  "University of St Andrews",
];

export default function AcademicResults() {
  return (
    <section id="results" className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-start mb-20">
          <div>
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
              THE PROOF
            </p>
            <h2 className="text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-8">
              OUR<br /><span className="text-[var(--gold)]">RESULTS.</span>
            </h2>
            <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
              REAL PAST PAPERS. REAL EXAMINER STANDARDS.
            </p>
          </div>

          <div className="space-y-8">
            {methodPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <CheckCircle2 size={24} className="text-[var(--gold)] flex-shrink-0 mt-1" />
                <span className="text-xl font-bold text-[var(--navy)] dark:text-white leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-8 text-center md:text-left">Students placed at</p>
          <div className="flex flex-wrap gap-4">
            {unis.map((uni, idx) => (
              <div key={idx} className="flex items-center gap-3 px-6 py-4 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[6px_6px_0px_var(--navy)] transition-all">
                <Landmark size={18} className="text-[var(--gold)]" />
                <span className="text-sm font-bold text-[var(--navy)] dark:text-white tracking-wide">{uni}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-6 py-4 rounded-none bg-[var(--gold-light-bg)] dark:bg-[var(--gold)]/20 border border-[var(--gold)] text-[var(--gold)] hover:shadow-[6px_6px_0px_var(--gold)] transition-all">
              <Plus size={18} />
              <span className="text-sm font-black uppercase tracking-widest">30+ more</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

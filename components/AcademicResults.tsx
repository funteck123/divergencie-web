"use client";

import { Landmark, Plus } from "lucide-react";

const resultsData = [
  { subject: "Mathematics", percent: 96, label: "A*–A" },
  { subject: "Physics", percent: 92, label: "A*–A" },
  { subject: "Chemistry", percent: 89, label: "A*–A" },
  { subject: "Economics", percent: 94, label: "A*–A" },
  { subject: "English Language", percent: 88, label: "A*–A" },
  { subject: "IELTS", percent: 91, label: "Band 7.5+" },
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
    <section id="results" className="py-24 min-h-screen flex flex-col justify-center bg-[var(--bg-primary)]">
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
              2025–26 COHORT. REAL STUDENTS. REAL A*S. NO AIRBRUSHING.
            </p>
          </div>

          <div className="space-y-10">
            {resultsData.map((res, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-wider">{res.subject}</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[var(--navy)] dark:text-white">{res.percent}%</span>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{res.label}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-none overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--sky)] to-[var(--gold)] rounded-none transition-all duration-1000 group-hover:brightness-110" 
                    style={{ width: `${res.percent}%` }}
                  ></div>
                </div>
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

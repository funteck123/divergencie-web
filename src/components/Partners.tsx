"use client";

import { ShieldCheck, Award, Video, Zap, Info } from "lucide-react";

export default function Partners() {
  return (
    <section className="py-24 bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center mb-20">
          <div>
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
              WHO WE ROLL WITH
            </p>
            <h2 className="text-4xl sm:text-6xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-8 break-words w-full">
              OUR<br /><span className="text-[var(--gold)]">CO-CONSPIRATORS.</span>
            </h2>
            <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
              CERTIFIED BY THE WORLD&apos;S LEADING BODIES.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Card 1 */}
          <div className="p-10 rounded-none bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)]">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mb-1">Certification Body</p>
                <p className="text-lg font-black text-[var(--navy)] dark:text-white leading-tight">Cambridge Assessment<br />International Education</p>
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed mb-8">
              The world&apos;s largest provider of international education programmes. Our coaches are certified Cambridge examiners — they don&apos;t just teach the syllabus, they helped write the mark schemes.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 text-[10px] font-bold text-[var(--navy)] dark:text-white uppercase tracking-wider">
              <ShieldCheck size={12} className="text-[var(--gold)]" />
              Certified Examiner Partner
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-10 rounded-none bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)]">
                <Award size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mb-1">Certification Body</p>
                <p className="text-lg font-black text-[var(--navy)] dark:text-white leading-tight">CollegeBoard<br />AP & SAT</p>
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed mb-8">
              The authority behind Advanced Placement and the SAT. Our CollegeBoard-certified coaches have guided students to top scores and US university placements across 40+ countries.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 text-[10px] font-bold text-[var(--navy)] dark:text-white uppercase tracking-wider">
              <ShieldCheck size={12} className="text-[var(--gold)]" />
              Certified AP Coach
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-10 rounded-none bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] md:col-span-2 lg:col-span-1 hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)]">
                <Video size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mb-1">Infrastructure</p>
                <p className="text-lg font-black text-[var(--navy)] dark:text-white leading-tight">Zoom · Classroom · Whiteboard</p>
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed mb-8">
              Every live session runs on enterprise-grade tools — Zoom for class, Google Classroom for materials, Microsoft Whiteboard for real-time problem solving. No dodgy third-party apps.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 text-[10px] font-bold text-[var(--navy)] dark:text-white uppercase tracking-wider">
              <Zap size={12} className="text-[var(--gold)]" />
              Enterprise Stack
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
          <Info size={14} className="text-[var(--gold)]" />
          All certifications are independently verified. Results and examiner credentials available on request.
        </div>
      </div>
    </section>
  );
}

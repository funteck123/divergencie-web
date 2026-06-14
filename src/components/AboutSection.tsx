"use client";

import { Fingerprint, GitBranch, Trophy, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

const traits = [
  {
    icon: <Fingerprint size={24} />,
    title: "Personalised",
    desc: "No two students. No two strategies.",
  },
  {
    icon: <GitBranch size={24} />,
    title: "Process-Driven",
    desc: "Structure that creates freedom, not restriction.",
  },
  {
    icon: <Trophy size={24} />,
    title: "Excellence-Oriented",
    desc: "We only work with students ready to do the work.",
  },
  {
    icon: <Zap size={24} />,
    title: "Divergent Thinkers",
    desc: "The best applications don't follow the template.",
  },
];

export default function AboutSection() {
  return (
    <section className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left: Content */}
          <div>
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
              WE&apos;RE A BUNCH OF ODDBALLS
            </p>
            <h2 className="text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-8">
              ARE<br />YOU?
            </h2>
            <p className="text-sm font-black tracking-[0.15em] text-[var(--text-muted)] uppercase mb-12 max-w-md leading-relaxed">
              WE DON&apos;T BELIEVE IN COOKIE-CUTTER APPLICATIONS. WE FIND WHAT MAKES
              YOU GENUINELY DIFFERENT — AND BUILD A STRATEGY AROUND IT.
            </p>

            <div className="grid sm:grid-cols-2 gap-8 mb-12">
              {traits.map((trait, idx) => (
                <div key={idx} className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-none bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--navy)] dark:text-white">
                    {trait.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--navy)] dark:text-white mb-1">{trait.title}</h3>
                    <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">{trait.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/services"
              className="inline-flex items-center gap-3 bg-[var(--gold)] px-10 py-5 rounded-none text-lg font-black text-white shadow-2xl shadow-[var(--gold)]/30 hover:scale-105 active:scale-95 transition-all"
            >
              Sounds Like Me
              <ArrowRight size={20} />
            </Link>
          </div>

          {/* Right: Card Stack */}
          <div className="relative aspect-square max-w-lg mx-auto w-full">
            {/* Card Back 1 */}
            <div className="absolute top-4 left-4 w-full h-full bg-[var(--navy)]/5 rounded-none rotate-6 border border-[var(--border-subtle)]"></div>
            {/* Card Back 2 */}
            <div className="absolute top-2 left-2 w-full h-full bg-[var(--navy)]/10 rounded-none -rotate-3 border border-[var(--border-subtle)]"></div>
            
            {/* Main Card */}
            <div className="relative w-full h-full bg-white dark:bg-[var(--bg-secondary)] rounded-none p-10 md:p-14 shadow-2xl border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <p className="text-[var(--gold)] font-black tracking-widest uppercase text-xs mb-6">Your profile</p>
                <p className="text-3xl md:text-4xl font-black text-[var(--navy)] dark:text-white leading-tight">
                  &quot;I know I&apos;m capable of more. I just need someone who actually gets it.&quot;
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex flex-wrap gap-2">
                  {["Ambitious", "Curious", "Under-advised", "DivergenCIE material"].map((tag, idx) => (
                    <span 
                      key={idx} 
                      className={`px-4 py-2 rounded-none text-xs font-black tracking-wider uppercase ${tag === "DivergenCIE material" ? 'bg-[var(--gold)] text-white' : 'bg-[var(--bg-secondary)] dark:bg-white/5 text-[var(--text-muted)]'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-2xl font-black text-[var(--navy)] dark:text-white">98%</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-tight">First choice<br />placement</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--navy)] dark:text-white">40+</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-tight">Countries<br />represented</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--navy)] dark:text-white">0x</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-tight">Recycled<br />essays</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

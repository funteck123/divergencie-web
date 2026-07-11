"use client";

import { Newspaper, Radio, Globe } from "lucide-react";

const pressLogos = [
  { name: "The Guardian Education", icon: <Newspaper size={20} /> },
  { name: "Times Higher Education", icon: <Newspaper size={20} /> },
  { name: "BBC Learning", icon: <Radio size={20} /> },
  { name: "The Independent", icon: <Newspaper size={20} /> },
  { name: "The Telegraph Education", icon: <Newspaper size={20} /> },
  { name: "EdSurge", icon: <Globe size={20} /> },
  { name: "Tes Magazine", icon: <Globe size={20} /> },
  { name: "Varsity", icon: <Globe size={20} /> },
];

export default function Press() {
  return (
    <section className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
            THE PAPARAZZI
          </p>
          <h2 className="text-5xl sm:text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85] mb-6">
            THEY&apos;RE<br /><span className="text-[var(--gold)]">WATCHING.</span>
          </h2>
          <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
            EDUCATION COVERAGE & THOUGHT LEADERSHIP.
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
          * Press coverage in progress. Logos shown indicate target media publications.
        </p>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";

function Counter({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/\d/g, "");
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const end = target;
    if (start === end) return;
    
    let startTime: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const allStats = [
  { value: "70+", label: "Students placed at\nTop 10 UK universities" },
  { value: "40+", label: "Countries our\nstudents come from" },
  { value: "98%", label: "Of students placed\nat their first choice" },
  { value: "10+", label: "Years of admissions\nexpertise" },
  { value: "0x", label: "Recycled essays.\nEver.", highlight: "Ever." },
  { value: "0%", label: "Generic advice.\nZero tolerance.", highlight: "Zero tolerance." },
  { value: "100%", label: "Bespoke strategy,\nevery student." },
  { value: "1st", label: "Cambridge & CollegeBoard\ncertified coaches.", gold: true },
];

export default function Stats() {
  return (
    <section className="py-24 bg-white dark:bg-[var(--bg-primary)] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
            MAKE UNIVERSITIES AN OFFER
          </p>
          <h2 className="text-6xl md:text-8xl font-black text-black dark:text-white leading-tight">
            They can&apos;t refuse.
          </h2>
        </div>

        {/* Unified Grid */}
        <div className="border border-[var(--border-subtle)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {allStats.map((stat, idx) => (
              <div 
                key={idx} 
                className={`p-10 border-[var(--border-subtle)] ${
                  idx < 4 ? 'border-b lg:border-b' : ''
                } ${
                  idx % 4 !== 3 ? 'lg:border-r' : ''
                } ${
                  idx % 2 !== 1 ? 'md:border-r lg:border-r-0' : ''
                } ${
                  stat.gold ? 'bg-[var(--gold)] text-white' : 'bg-transparent'
                }`}
              >
                <p className={`text-5xl md:text-7xl font-black mb-6 ${
                  stat.gold 
                    ? 'text-white' 
                    : (['0x', '0%', '100%'].includes(stat.value) ? 'text-black dark:text-white' : 'text-[var(--gold)]')
                }`}>
                  {stat.value === "1st" ? stat.value : <Counter value={stat.value} />}
                </p>
                <p className={`text-sm font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line ${
                  stat.gold ? 'text-white/90' : 'text-[var(--text-muted)]'
                }`}>
                  {stat.label.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {stat.highlight && line.includes(stat.highlight) ? (
                        <span className="block text-[var(--gold)]">{stat.highlight}</span>
                      ) : null}
                      {i === 0 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Accreditation */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-16 text-xs font-black uppercase tracking-[0.2em]">
          <span className="text-[var(--text-muted)]">CERTIFIED BY</span>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--gold)]" />
            <span className="text-black dark:text-white">Cambridge Assessment International Education</span>
          </div>
          <span className="hidden md:block text-[var(--gold)]">•</span>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--gold)]" />
            <span className="text-black dark:text-white">CollegeBoard</span>
          </div>
        </div>
      </div>
    </section>
  );
}

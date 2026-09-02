"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ShieldCheck, GraduationCap, Globe, Zap, ArrowRight, Check, Award, BookOpen, Presentation, Layout, Users } from "lucide-react";
import Link from "next/link";

const services = [
  {
    id: "igcse",
    category: "exams",
    title: "IGCSE Coaching",
    desc: "Grades 9–10 preparation for Cambridge IGCSE. Structured sessions, past paper drills, and A* strategy for every major subject group.",
    subjects: ["Mathematics", "Sciences", "English", "Economics", "+ more"],
    icon: <BookOpen />,
    accent: "var(--navy)",
  },
  {
    id: "a-level",
    category: "exams",
    title: "A Level Coaching",
    desc: "AS and A2 preparation for Cambridge A Levels. University-targeted coaching with Oxford, Cambridge, LSE, and Imperial pathways in focus.",
    subjects: ["Mathematics", "Further Maths", "Physics", "Chemistry", "+ more"],
    badge: "Uni-Ready Track",
    icon: <GraduationCap />,
    accent: "var(--navy)",
    footerLabel: "UK & Global University Ready"
  },
  {
    id: "ap",
    category: "exams",
    title: "AP Coaching",
    desc: "Advanced Placement exam preparation for US college admissions. Score 4–5 strategy, FRQ practice, and CollegeBoard-aligned curriculum.",
    subjects: ["AP Calculus", "AP Physics", "AP Chemistry", "AP Statistics", "+ more"],
    icon: <Zap />,
    accent: "#1a5bbf",
  },
  {
    id: "ib",
    category: "exams",
    title: "IB Diploma Coaching",
    desc: "HL and SL support for the International Baccalaureate Diploma Programme. TOK essays, IA guidance, and exam technique across all six groups.",
    subjects: ["HL Mathematics", "HL Sciences", "HL Economics", "TOK / EE", "+ more"],
    badge: "IB Specialist",
    icon: <Globe />,
    accent: "#0d6c50",
    footerLabel: "IB Specialist Teachers"
  },
  {
    id: "sat",
    category: "exams",
    title: "SAT / ACT Prep",
    desc: "Target 1500+ SAT or 33+ ACT. Full diagnostic, section-by-section strategy, and timed practice under real exam conditions.",
    subjects: ["SAT Math", "SAT Reading", "ACT English", "ACT Science"],
    badge: "US Admissions",
    icon: <Presentation />,
    accent: "var(--gold)",
    footerLabel: "US Admissions Track Record"
  },
  {
    id: "ielts",
    category: "language",
    title: "IELTS / TOEFL Prep",
    desc: "Band 7.5+ IELTS and 105+ TOEFL coaching. Speaking mock tests, Writing Task feedback with examiner-style marking.",
    subjects: ["IELTS Academic", "IELTS General", "TOEFL iBT", "Speaking Mock"],
    badge: "Visa Ready",
    icon: <ShieldCheck />,
    accent: "var(--sky)",
    footerLabel: "University Visa Ready"
  },
  {
    id: "uni",
    category: "admissions",
    title: "University Applications",
    desc: "End-to-end guidance for UCAS, Common App, and elite university admissions. Personal Statement coaching and interview prep.",
    subjects: ["UCAS", "Common App", "Personal Statement", "Oxbridge Track"],
    badge: "Premium Support",
    icon: <Layout />,
    accent: "var(--gold)",
    wide: true,
    footerLabel: "Global University Ready"
  },
  {
    id: "career",
    category: "admissions",
    title: "Career Counselling",
    desc: "Clarity sessions for subject selection, course choices, and career pathways. Psychometric profiling and roadmap planning.",
    subjects: ["Subject Selection", "Course Mapping", "Psychometric", "Roadmap"],
    badge: "1-on-1 Sessions",
    icon: <Users />,
    accent: "var(--sky)",
    wide: true,
    footerLabel: "Career Roadmap Strategy"
  }
];

export default function ServicesPage() {
  const [filter, setFilter] = useState("all");

  const filteredServices = services.filter(s => filter === "all" || s.category === filter);

  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Hero */}
      <section className="pt-48 pb-12 bg-[var(--navy)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,var(--gold)_0%,transparent_60%)]"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">OUR EXPERTISE</p>
          <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8 uppercase">
            Every Subject.<br />
            <span className="text-[var(--gold)]">One Partner.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium mb-12">
            From IGCSE to university applications. We coach the full academic journey for students worldwide.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {["IB Specialists", "World Toppers"].map((b, i) => (
              <span key={i} className="px-6 py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-16 z-40 bg-white/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto no-scrollbar gap-8 py-4">
            {["all", "exams", "language", "admissions"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                  filter === f ? "text-[var(--gold)] border-b-2 border-[var(--gold)] pb-4 -mb-4" : "text-[var(--text-muted)] hover:text-black dark:hover:text-white"
                }`}
              >
                {f === "all" ? "All Services" : f === "exams" ? "Exam Prep" : f === "language" ? "Language Tests" : "Admissions"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((s, idx) => (
              <div 
                key={s.id} 
                className={`p-10 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all flex flex-col group ${
                  s.wide ? 'lg:col-span-1' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-white transition-colors">
                    {s.icon}
                  </div>
                  {s.badge && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)]">{s.badge}</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase mb-4">{s.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 flex-grow">{s.desc}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {s.subjects.map((sub, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] uppercase tracking-wider">{sub}</span>
                  ))}
                </div>
                <Link 
                  href={`/services/${s.id}`}
                  className="pt-8 border-t border-[var(--border-subtle)] flex justify-between items-center group/link"
                >
                  {s.footerLabel ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">{s.footerLabel}</span>
                  ) : <span />}
                  <div className="w-10 h-10 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center group-hover/link:bg-[var(--navy)] group-hover/link:text-white transition-all">
                    <ArrowRight size={18} />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why DC */}
      <section className="py-24 bg-[var(--navy)] text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">WHY DIVERGENCIE</p>
              <h2 className="text-5xl font-black mb-8 leading-tight">NOT A TUITION CENTRE.<br /><span className="text-[var(--gold)]">A RESULTS MACHINE.</span></h2>
              <p className="text-white/60 text-lg mb-12">We don&apos;t do group classes with 40 students. Every session is tailored, every chapter tracked, every past paper reviewed.</p>
              <div className="space-y-6">
                {[
                  "A*-focused curriculum mapped to exam mark schemes.",
                  "Live Zoom sessions with MS Whiteboard, recorded forever.",
                  "24/7 Portal access for resources and progress tracking."
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check size={12} strokeWidth={4} className="text-[var(--gold)]" />
                    </div>
                    <p className="font-bold">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { val: "98%", label: "Grade Improvement Rate" },
                { val: "100%", label: "Bespoke Strategy" },
                { val: "20+", label: "Countries Reached" },
                { val: "4+", label: "Years of Mentoring Expertise" }
              ].map((s, i) => (
                <div key={i} className="p-8 border border-white/10 bg-white/5">
                  <p className="text-5xl font-black text-[var(--gold)] mb-2">{s.val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Mic, ArrowRight, Star, FlaskConical } from "lucide-react";
import Link from "next/link";

type ServiceGroup = { subjects: string[]; board: string; courseLevel: string };
type ApiGroups = Record<string, ServiceGroup[]>;

type CardData = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  subjects: string[];
  popular?: boolean;
};

const TYPE_META: Record<string, Omit<CardData, "subjects">> = {
  CAMBRIDGE: {
    icon: <BookOpen size={32} />,
    title: "Cambridge\nIGCSE & A Level",
    desc: "Taught by Cambridge Country & World Toppers and certified examiners. We don't just teach the syllabus. We teach you how to think like the examiner.",
    popular: true,
  },
  CAIE: {
    icon: <BookOpen size={32} />,
    title: "Cambridge\nIGCSE & A Level",
    desc: "Taught by Cambridge Country & World Toppers and certified examiners. We don't just teach the syllabus. We teach you how to think like the examiner.",
    popular: true,
  },
  AP: {
    icon: <GraduationCap size={32} />,
    title: "AP · IB · SAT\n& ACT Prep",
    desc: "CollegeBoard-certified coaching built for students targeting top US universities. Strategy, content, and timed practice, from first session to test day.",
  },
  IB: {
    icon: <GraduationCap size={32} />,
    title: "IB Programme\nCoaching",
    desc: "Rigorous IB HL/SL coaching for every subject. Internal assessments, extended essays, and exam strategy. We cover it all.",
  },
  SAT: {
    icon: <GraduationCap size={32} />,
    title: "SAT & ACT\nTest Prep",
    desc: "Score-maximising strategies for US standardised testing. Timed drills, real exam conditions, and section-by-section mastery.",
  },
  IELTS: {
    icon: <Mic size={32} />,
    title: "IELTS & TOEFL\nMastery",
    desc: "Band 8+ and 110+ score coaching. Every section, every skill: Reading, Writing, Listening, Speaking. Real exam conditions. Real results.",
  },
  TOEFL: {
    icon: <Mic size={32} />,
    title: "TOEFL\nCoaching",
    desc: "110+ score prep with section-by-section mastery, timed practice, and expert feedback on every response.",
  },
  LANGUAGE: {
    icon: <Mic size={32} />,
    title: "Language\nProgrammes",
    desc: "Expert-led language coaching for English proficiency tests and academic writing. Built for international students.",
  },
};

const STATIC_FALLBACK: CardData[] = [
  {
    icon: <BookOpen size={32} />,
    title: "Cambridge\nIGCSE & A Level",
    desc: "Taught by Cambridge Country & World Toppers and certified examiners. We don't just teach the syllabus. We teach you how to think like the examiner.",
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "English", "+ more"],
    popular: true,
  },
  {
    icon: <GraduationCap size={32} />,
    title: "AP · IB · SAT\n& ACT Prep",
    desc: "CollegeBoard-certified coaching built for students targeting top US universities. Strategy, content, and timed practice, from first session to test day.",
    subjects: ["AP Calculus", "AP Physics", "AP Chemistry", "SAT Math", "ACT Science", "IB HL/SL"],
  },
  {
    icon: <Mic size={32} />,
    title: "IELTS & TOEFL\nMastery",
    desc: "Band 8+ and 110+ score coaching. Every section, every skill: Reading, Writing, Listening, Speaking. Real exam conditions. Real results.",
    subjects: ["Academic IELTS", "General IELTS", "TOEFL iBT", "Speaking Drills", "Writing Tasks"],
  },
];

function buildCards(groups: ApiGroups): CardData[] {
  return Object.entries(groups).map(([serviceType, combos]) => {
    const key = serviceType.toUpperCase();
    const meta = TYPE_META[key] ?? {
      icon: <FlaskConical size={32} />,
      title: serviceType,
      desc: "Expert-led coaching programme delivered by certified tutors. Small groups, personalised attention, guaranteed results.",
    };
    const allSubjects = Array.from(new Set(combos.flatMap((c: ServiceGroup) => c.subjects))).slice(0, 7);
    if (allSubjects.length === 7) allSubjects[6] = "+ more";
    return { ...meta, subjects: allSubjects };
  });
}

export default function ServicesGrid() {
  const [cards, setCards] = useState<CardData[]>(STATIC_FALLBACK);

  useEffect(() => {
    fetch("/api/public/services")
      .then(r => r.json())
      .then(data => {
        if (data?.groups && Object.keys(data.groups).length > 0) {
          setCards(buildCards(data.groups));
        }
      })
      .catch(() => {/* keep static fallback */});
  }, []);

  return (
    <section className="py-24 bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-20">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
            WHAT WE DO
          </p>
          <h2 className="text-7xl md:text-9xl font-black text-[var(--navy)] dark:text-white leading-[0.85]">
            WHAT&apos;S<br /><span className="text-[var(--gold)]">COOKING.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {cards.map((svc, idx) => (
            <div
              key={idx}
              className={`relative p-10 rounded-none bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_var(--gold)] flex flex-col justify-between ${svc.popular ? "ring-2 ring-[var(--gold)]" : ""}`}
            >
              {svc.popular && (
                <div className="absolute -top-4 right-10 bg-[var(--gold)] text-white px-4 py-2 rounded-none text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-lg">
                  <Star size={12} fill="white" />
                  Most Popular
                </div>
              )}

              <div>
                <div className="w-16 h-16 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--navy)] dark:text-white mb-8">
                  {svc.icon}
                </div>
                <h3 className="text-3xl font-black text-[var(--navy)] dark:text-white leading-tight mb-6 whitespace-pre-line">
                  {svc.title}
                </h3>
                <p className="text-base font-medium text-[var(--text-muted)] leading-relaxed mb-8">
                  {svc.desc}
                </p>

                <div className="flex flex-wrap gap-2 mb-12">
                  {svc.subjects.map((sub, sidx) => (
                    <span key={sidx} className="px-3 py-1.5 rounded-none bg-[var(--bg-secondary)] dark:bg-white/5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/services"
                className="group flex items-center gap-3 text-lg font-black text-[var(--navy)] dark:text-white hover:text-[var(--gold)] transition-colors"
              >
                Enrol Now
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-20 p-12 rounded-none bg-[var(--navy)] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)] opacity-10 rounded-full blur-3xl -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <p className="text-2xl md:text-3xl font-black leading-tight">
              Not sure which programme fits?<br />
              <span className="text-[var(--gold)]">We&apos;ll tell you in 15 minutes.</span>
            </p>
          </div>

          <Link
            href="/contact"
            className="relative z-10 flex items-center gap-4 bg-[var(--gold)] px-10 py-5 rounded-none text-lg font-black text-white shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all"
          >
            Book a Free Call
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Briefcase, Users, Star, GraduationCap, ArrowRight, Zap, Globe } from "lucide-react";
import { useState, useEffect } from "react";

type JobPosting = { id: string; role: string; dept: string; description: string };

const STATIC_FALLBACK: JobPosting[] = [
  { id: "teacher", role: "Teacher", dept: "Academic Department", description: "Deliver live 1-on-1 and small-group sessions for IGCSE, A Level, AP, or IB students. Mark past papers, track progress, and coach toward A*." },
  { id: "ta", role: "Teaching Assistant (TA)", dept: "Academic Department", description: "Support our lead tutors in delivering sessions. Mark past papers, prepare resources, and run doubt-resolution slots." },
  { id: "sm", role: "Social Media Manager (SM)", dept: "Marketing Department", description: "Own our Instagram and LinkedIn presence. Create Reels, carousels, and stories that convert students into achievers." },
  { id: "hr", role: "HR & People Coordinator", dept: "HR Department", description: "Manage tutor onboarding, contracts, and scheduling. Help build a culture where every team member performs." },
];

const DEPT_ICONS: Record<string, React.ReactNode> = {
  "Academic Department": <GraduationCap />,
  "Marketing Department": <Zap />,
  "HR Department": <Users />,
  "IT Department": <Globe />,
};

function RoleSkeleton() {
  return (
    <div className="p-10 border border-[var(--border-subtle)] flex flex-col gap-4 animate-pulse">
      <div className="w-14 h-14 bg-[var(--bg-secondary)] dark:bg-white/5" />
      <div className="h-3 w-20 bg-[var(--bg-secondary)] dark:bg-white/5 rounded" />
      <div className="h-5 w-48 bg-[var(--bg-secondary)] dark:bg-white/5 rounded" />
      <div className="h-3 w-32 bg-[var(--bg-secondary)] dark:bg-white/5 rounded" />
      <div className="space-y-2 flex-grow">
        <div className="h-3 w-full bg-[var(--bg-secondary)] dark:bg-white/5 rounded" />
        <div className="h-3 w-5/6 bg-[var(--bg-secondary)] dark:bg-white/5 rounded" />
      </div>
    </div>
  );
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data: JobPosting[]) => {
        setJobs(Array.isArray(data) && data.length > 0 ? data : STATIC_FALLBACK);
      })
      .catch(() => setJobs(STATIC_FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />

      {/* Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white text-center">
        <div className="container mx-auto px-4">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">JOIN THE MISSION</p>
          <h1 className="text-6xl md:text-8xl font-black mb-8 uppercase leading-tight">Build <span className="text-[var(--gold)]">World-Class</span><br />Education.</h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">We&apos;re looking for obsessed tutors, creatives, and operators to redefine the student journey.</p>
        </div>
      </section>

      {/* Values Strip */}
      <section className="py-12 border-b border-[var(--border-subtle)]">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {["Fully Remote", "Results Obsessed", "Fast Growth", "Merit Based Pay", "Global Team"].map((v, i) => (
              <div key={i} className="px-6 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest">{v}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <RoleSkeleton key={i} />)
              : jobs.map((job) => (
                <div key={job.id} className="p-10 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all flex flex-col group">
                  <div className="w-14 h-14 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-white transition-colors mb-8">
                    {DEPT_ICONS[job.dept] ?? <Briefcase />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)] mb-2">{job.dept}</p>
                  <h3 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase mb-6">{job.role}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed flex-grow mb-8">{job.description}</p>
                  <Link href="/register?requestedType=StaffInterview" className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white pt-8 border-t border-[var(--border-subtle)] flex justify-between items-center group/link">
                    <span>Apply Now</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Ambassador Section */}
      <section className="py-24 bg-[var(--navy)] text-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">FOR STUDENTS</p>
              <h2 className="text-5xl font-black mb-8 leading-tight">DivergenCIE<br /><span className="text-[var(--gold)]">Ambassadors</span></h2>
              <p className="text-white/60 text-lg mb-12 leading-relaxed">Represent DivergenCIE at your school, earn rewards, and build a world-class portfolio for your university applications.</p>
              <div className="space-y-6">
                {[
                  "Represent DC at your school and online.",
                  "Earn referral rewards and fee discounts.",
                  "Build your CV with formal recognition letters."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--gold)] text-black flex items-center justify-center font-black">{i + 1}</div>
                    <p className="font-bold">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-12 border border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/10 blur-3xl group-hover:bg-[var(--gold)]/20 transition-all"></div>
              <Star className="text-[var(--gold)] w-12 h-12 mb-8" />
              <h3 className="text-3xl font-black mb-4 uppercase">Join The Elite</h3>
              <p className="text-white/60 mb-8 leading-relaxed">We select only 2 ambassadors per region. If you&apos;re a topper with influence, we want to hear from you.</p>
              <Link href="/register?requestedType=AmbassadorInterview" className="inline-block py-4 px-10 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">Apply Today</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Application CTA -- TKT-0198: the old inline form (which posted to
          a route that didn't exist, /api/careers/apply -- a real dead end)
          is gone. Every "Apply" link on this page now goes straight to the
          real registration portal instead. */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-wider mb-4">Start Your Journey</h2>
          <p className="text-[var(--text-muted)] mb-12">Pick a role above, or apply directly below. We reply via WhatsApp within 48 hours.</p>
          <Link
            href="/register?requestedType=StaffInterview"
            className="inline-flex items-center gap-3 py-5 px-12 bg-[var(--navy)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--gold)] hover:text-black transition-all"
          >
            Apply Now <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

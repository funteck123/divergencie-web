"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { CheckCircle2, ArrowRight, Timer, Award, BookOpen, Presentation, Layout, Users, Globe, Zap, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";

const SERVICE_DATA: Record<string, any> = {
  "igcse": {
    title: "IGCSE",
    fullTitle: "IGCSE Coaching",
    headline: "IGCSE Coaching that Produces World Toppers",
    sub: "Grades 9–11 preparation for Cambridge IGCSE. Structured sessions, past paper drills, and A* strategy for every major subject group.",
    badge: "Cambridge Authorised",
    icon: <BookOpen />,
    stats: [
      { val: "40+", lbl: "Toppers" },
      { val: "98%", lbl: "A*–B Rate" },
      { val: "25+", lbl: "Subjects" }
    ],
    subjects: ["Mathematics (0580/0606)", "Physics (0625)", "Chemistry (0620)", "Biology (0610)", "Economics (0455)", "Business Studies (0450)", "English Language", "Computer Science"],
    features: [
      { t: "Live 1-to-1 Sessions", d: "Personalised Zoom classes with interactive whiteboard. Your pace, your questions." },
      { t: "Past Paper Drilling", d: "Systematic walkthrough of marking schemes to understand examiner expectations." },
      { t: "A* Checklist", d: "Chapter-by-chapter tracking of your progress against the official syllabus." }
    ]
  },
  "a-level": {
    title: "A Level",
    fullTitle: "A Level Coaching",
    headline: "Elite A Level Prep for Global University Entry",
    sub: "AS and A2 preparation for Cambridge A Levels. University-targeted coaching with elite pathways in focus.",
    badge: "Uni-Ready Track",
    icon: <GraduationCap />,
    stats: [
      { val: "15+", lbl: "Subjects" },
      { val: "95%", lbl: "A*–A Rate" },
      { val: "100%", lbl: "Uni Success" }
    ],
    subjects: ["AS & A2 Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Further Mathematics", "Business", "Sociology"],
    features: [
      { t: "University Alignment", d: "Content mapped to top-tier university entry requirements (LSE, Imperial, Oxbridge)." },
      { t: "Full Mock Exams", d: "Timed full-length papers under real pressure conditions with detailed feedback." },
      { t: "Concept Mastery", d: "Focus on first principles to handle even the hardest multi-part questions." }
    ]
  },
  "ap": {
    title: "AP",
    fullTitle: "AP Exam Coaching",
    headline: "Advanced Placement Score 5 Strategy",
    sub: "Preparation for CollegeBoard AP exams. Personalised coaching for US college credit and admissions.",
    badge: "CollegeBoard Partner",
    icon: <Zap />,
    stats: [
      { val: "10+", lbl: "AP Subjects" },
      { val: "Score 5", lbl: "Track Record" },
      { val: "US Focus", lbl: "Curriculum" }
    ],
    subjects: ["AP Calculus BC", "AP Physics C", "AP Chemistry", "AP Biology", "AP Statistics", "AP Macroeconomics", "AP Microeconomics", "AP Computer Science"],
    features: [
      { t: "FRQ Workshops", d: "Intensive practice on Free Response Questions with scoring rubric analysis." },
      { t: "College Credit Focus", d: "Strategy designed to maximize your chances of earning university credits." },
      { t: "CollegeBoard Aligned", d: "Taught by tutors who specialize in the latest AP curriculum changes." }
    ]
  },
  "ib": {
    title: "IB Diploma",
    fullTitle: "IB Diploma Support",
    headline: "Master the IB DP with Specialist Coaches",
    sub: "HL and SL support for the International Baccalaureate. TOK, IA, and EE guidance for high-achieving students.",
    badge: "IB Specialist",
    icon: <Globe />,
    stats: [
      { val: "40+", lbl: "Points Average" },
      { val: "HL/SL", lbl: "All Groups" },
      { val: "TOK/EE", lbl: "Guidance" }
    ],
    subjects: ["HL/SL Mathematics AA/AI", "Physics", "Chemistry", "Economics", "Biology", "English A", "Psychology", "Theory of Knowledge"],
    features: [
      { t: "IA / EE Mentorship", d: "One-to-one guidance on your Internal Assessments and Extended Essays." },
      { t: "Conceptual Learning", d: "Focus on the IB global context and TOK integration across subjects." },
      { t: "Exam Technique", d: "Master the command terms and structured response formats unique to IB." }
    ]
  },
  "sat": {
    title: "SAT / ACT",
    fullTitle: "SAT & ACT Prep",
    headline: "Target 1550+ on the Digital SAT",
    sub: "Strategic preparation for US college entrance exams. Personalised drills, timing strategies, and score-boosting techniques.",
    badge: "US Admissions",
    icon: <Presentation />,
    stats: [
      { val: "1500+", lbl: "Average Target" },
      { val: "Digital", lbl: "SAT Ready" },
      { val: "Timed", lbl: "Conditions" }
    ],
    subjects: ["Digital SAT Math", "SAT Reading & Writing", "ACT Composite", "ACT Science", "Subject Tests", "Essay Prep"],
    features: [
      { t: "Diagnostic Driven", d: "Every plan starts with a full diagnostic test to identify your weakest sections." },
      { t: "Digital Platform", d: "Practice on platforms that mirror the Bluebook app for Digital SAT readiness." },
      { t: "Timing Strategy", d: "Learn shortcuts and pacing rules to finish every section with time for review." }
    ]
  },
  "ielts": {
    title: "IELTS / TOEFL",
    fullTitle: "Language Proficiency",
    headline: "Band 8.0+ IELTS & 110+ TOEFL Prep",
    sub: "Intensive coaching for English proficiency tests. Speaking mocks and detailed writing feedback from experts.",
    badge: "Visa Ready",
    icon: <ShieldCheck />,
    stats: [
      { val: "Band 8.0", lbl: "IELTS Target" },
      { val: "110+", lbl: "TOEFL Target" },
      { val: "1-to-1", lbl: "Mocks" }
    ],
    subjects: ["IELTS Academic", "IELTS General", "TOEFL iBT", "PTE Academic", "Speaking Drills", "Writing Correction"],
    features: [
      { t: "Speaking Mocks", d: "Face-to-face style video mocks with examiner feedback on fluency and grammar." },
      { t: "Writing Scans", d: "Detailed marking of your Task 1 and Task 2 essays within 48 hours." },
      { t: "Vocab Expansion", d: "Topic-specific vocabulary lists to hit higher band scores in all sections." }
    ]
  }
};

export default function DynamicServicePage() {
  const params = useParams();
  const slug = params.slug as string;
  const data = SERVICE_DATA[slug];

  if (!data) return notFound();

  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,var(--gold)_0%,transparent_60%)]"></div>
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,var(--sky)_0%,transparent_60%)]"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Link href="/services" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[var(--gold)] transition-colors">Services</Link>
              <span className="text-white/20">/</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">{data.title}</span>
            </div>

            <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center text-[var(--gold)] mb-8">
              {data.icon}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-8 uppercase leading-none tracking-tighter">
              {data.headline}
            </h1>
            
            <p className="text-lg text-white/60 mb-12 leading-relaxed">
              {data.sub}
            </p>

            <div className="flex flex-wrap justify-center gap-12 mt-8 border-t border-white/10 pt-12">
              {data.stats.map((s: any, i: number) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-black text-[var(--gold)]">{s.val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.lbl}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap gap-4">
              <Link href="/contact" className="py-5 px-12 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all">Enrol Now</Link>
              <Link href="/mock" className="py-5 px-12 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Try Free Mock</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-24 border-b border-[var(--border-subtle)]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--gold)] mb-4">SUBJECTS OFFERED</p>
             <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Expert Support Across All Boards</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.subjects.map((s: string, i: number) => (
              <div key={i} className="p-6 border border-[var(--border-subtle)] hover:border-[var(--navy)] transition-colors flex items-center gap-4 group bg-[var(--bg-secondary)] dark:bg-white/5">
                <div className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></div>
                <p className="text-[11px] font-black uppercase tracking-wider text-[var(--navy)] dark:text-white leading-tight">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {data.features.map((f: any, i: number) => (
              <div key={i} className="p-12 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] group hover:shadow-[15px_15px_0px_var(--navy)] transition-all">
                <h4 className="text-lg font-black uppercase text-[var(--navy)] dark:text-white mb-4">{f.t}</h4>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[var(--navy)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
           <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase leading-tight">Ready to Secure<br /><span className="text-[var(--gold)]">Your A*?</span></h2>
           <p className="text-white/60 mb-12 text-lg">Join the hundreds of students who have turned their predicted Bs into final A*s with DivergenCIE.</p>
           <div className="flex flex-wrap justify-center gap-6">
             <Link href="/contact" className="py-5 px-12 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all">Start 1-on-1 Coaching</Link>
             <Link href="/pricing" className="py-5 px-12 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">View Pricing Packages</Link>
           </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

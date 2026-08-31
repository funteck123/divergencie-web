import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Lock, FileText, Book, Target, Calculator, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

const materials = [
  {
    title: "Topical Past Papers",
    label: "Free",
    desc: "Cambridge IGCSE and A Level past papers organised by topic. Drill one concept at a time.",
    subjects: ["IGCSE", "A Level"],
    icon: <FileText />,
    cta: "Request via WhatsApp",
    link: "https://wa.me/919650675507"
  },
  {
    title: "Yearly Past Paper Books",
    label: "Free",
    desc: "Complete yearly past paper compilations for IGCSE and A Level, all variants included.",
    subjects: ["IGCSE", "A Level"],
    icon: <Book />,
    cta: "Request via WhatsApp",
    link: "https://wa.me/919650675507"
  },
  {
    title: "Predicted Papers",
    label: "Enrolled Students",
    desc: "Exclusive predicted papers built from examiner trend analysis. Not publicly available.",
    subjects: ["IGCSE", "A Level", "AP", "IB"],
    icon: <Target />,
    gated: true
  },
  {
    title: "AP Practice Questions",
    label: "Free",
    desc: "CollegeBoard-style multiple choice and free-response questions for major AP subjects.",
    subjects: ["AP"],
    icon: <Calculator />,
    cta: "Request via WhatsApp",
    link: "https://wa.me/919650675507"
  },
  {
    title: "IELTS & SAT Prep Guides",
    label: "Free",
    desc: "Section-by-section strategy guides for Writing, Speaking, Math and Reading.",
    subjects: ["IELTS", "TOEFL", "SAT", "ACT"],
    icon: <MessageSquare />,
    cta: "Request via WhatsApp",
    link: "https://wa.me/919650675507"
  },
  {
    title: "Chapter Summaries",
    label: "Enrolled Students",
    desc: "Tutor-written chapter summaries, formula sheets, and concept maps for every subject.",
    subjects: ["All Subjects"],
    icon: <FileText />,
    gated: true
  }
];

const blogPosts = [
  { tag: "IGCSE Maths", title: "How to Score Full Marks on IGCSE 0580 Paper 4", meta: "By Riya Sharma · 8 min read", icon: "📐" },
  { tag: "A Level Chemistry", title: "The 5 Organic Chemistry Mechanisms You Must Know", meta: "By Aryan Patel · 6 min read", icon: "⚗️" },
  { tag: "Admissions", title: "UCAS Personal Statement vs US Common App Essay", meta: "By DC Team · 10 min read", icon: "🎓" }
];

export default function ResourcesPage() {
  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,var(--gold)_0%,transparent_60%)]"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">STUDY SMARTER</p>
          <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8 uppercase">
            Everything You Need<br />
            <span className="text-[var(--gold)]">To Get A*</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">
            Free notes, past papers, predicted papers and study guides curated by world-class tutors.
          </p>
        </div>
      </section>

      {/* Materials Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {materials.map((m, idx) => (
              <div key={idx} className="p-10 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)] transition-all flex flex-col group">
                <div className="w-14 h-14 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-white transition-colors mb-8">
                  {m.icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)] mb-2">{m.label}</p>
                <h3 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase mb-4">{m.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 flex-grow">{m.desc}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {m.subjects.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] uppercase tracking-wider">{s}</span>
                  ))}
                </div>
                {m.gated ? (
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pt-8 border-t border-[var(--border-subtle)]">
                    <Lock size={12} />
                    <span>Portal Access Required</span>
                  </div>
                ) : (
                  <a href={m.link} target="_blank" rel="noopener" className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white pt-8 border-t border-[var(--border-subtle)] group/link">
                    <span>{m.cta}</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal CTA */}
      <section className="py-20 bg-[var(--navy)] text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-black mb-6 uppercase tracking-wider">Enrolled Students Get <span className="text-[var(--gold)]">Full Access</span></h2>
          <p className="text-white/60 mb-10 max-w-xl mx-auto">Predicted papers, examiner-marked chapter tests, recording library, and our proprietary A* gap analysis tool.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/login" className="px-8 py-4 bg-[var(--gold)] text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors">Go To My Portal</Link>
            <Link href="/contact" className="px-8 py-4 border-2 border-white/20 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-colors">Enrol Now</Link>
          </div>
        </div>
      </section>

      {/* Blog Teaser */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">LATEST INSIGHTS</p>
            <h2 className="text-5xl font-black text-[var(--navy)] dark:text-white uppercase">Study Guides</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, idx) => (
              <div key={idx} className="bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--gold)] transition-colors group">
                <div className="h-48 bg-[var(--navy)] flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-700">
                  {post.icon}
                </div>
                <div className="p-8">
                  <p className="text-[var(--gold)] text-[10px] font-black uppercase tracking-widest mb-2">{post.tag}</p>
                  <h3 className="text-lg font-black text-[var(--navy)] dark:text-white leading-tight mb-4">{post.title}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{post.meta}</p>
                  <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 text-[var(--text-muted)]">Coming Soon</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

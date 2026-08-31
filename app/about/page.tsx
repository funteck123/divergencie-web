import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ShieldCheck, Award, Globe, Zap, Users, GraduationCap, Star, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const teachers = [
  { name: "Aisha Rahman", role: "A Level Specialist", subject: "Mathematics · Further Maths", qual: "Cambridge Mathematics graduate · 8 yrs experience · 40+ A* students", avatar: "A" },
  { name: "Kiran Mehta", role: "AP & IGCSE", subject: "Physics · AP Physics", qual: "IIT Delhi · MSc Physics · Former Cambridge examiner · AP 5s lead", avatar: "K" },
  { name: "Sarah Al-Amin", role: "IELTS Lead", subject: "English Language · IELTS", qual: "Oxford English Literature · IELTS Band 9 · 200+ students coached", avatar: "S" },
  { name: "Reza Hussain", role: "Sciences Lead", subject: "Chemistry · Biology", qual: "UCL Biochemistry · 6 yrs A Level Chemistry · World Topper mentor", avatar: "R" },
  { name: "Tariq Osman", role: "IB & A Level", subject: "Economics · Business", qual: "LSE Economics · Cambridge A Level Economics specialist · IB Econ", avatar: "T" },
  { name: "Priya Nair", role: "SAT Specialist", subject: "SAT · ACT · College Prep", qual: "SAT 1580 · 5 yrs prep · Students admitted to Cornell, NYU, UCL", avatar: "P" },
];

const toppers = [
  { flag: "🇲🇾", name: "Farhan A.", score: "IGCSE World Topper · Maths" },
  { flag: "🇮🇳", name: "Prisha K.", score: "A Level Country Topper · Chemistry" },
  { flag: "🇸🇦", name: "Omar F.", score: "IGCSE Country Topper · Physics" },
  { flag: "🇵🇰", name: "Zara M.", score: "AP World Topper · Calculus BC" },
  { flag: "🇬🇧", name: "Callum R.", score: "A Level Country Topper · Economics" },
  { flag: "🇲🇾", name: "Mei Lin T.", score: "IGCSE World Topper · Biology" },
];

export default function AboutPage() {
  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Inner Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--gold)_0%,transparent_70%)]"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">OUR STORY</p>
          <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8">
            BUILT BY TOPPERS,<br />
            <span className="text-[var(--gold)]">FOR TOPPERS.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">
            DivergenCIE was founded on one belief: every student has the potential to reach the top — they just need the right system, mentors, and community.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="border-4 border-[var(--navy)] p-4">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                  alt="Students"
                  width={800}
                  height={533}
                  className="w-full grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-64 hidden md:block border-4 border-[var(--gold)] bg-white p-2">
                <Image
                  src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=400&q=80"
                  alt="Results"
                  width={400}
                  height={267}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-8">
              <div className="w-20 h-2 bg-[var(--gold)]"></div>
              <h2 className="text-4xl md:text-5xl font-black text-[var(--navy)] dark:text-white leading-tight">
                From One Student&apos;s <span className="text-[var(--gold)]">Frustration</span> to a Global Movement
              </h2>
              <div className="space-y-6 text-[var(--text-muted)] text-lg leading-relaxed">
                <p>DivergenCIE was born out of frustration — a Cambridge student who struggled to find quality, personalised coaching. Tutors were either too expensive, too generic, or disconnected from the actual exam system.</p>
                <p>We built something different. A platform designed by exam-takers, for exam-takers. Every method, every resource, every teacher is chosen with one goal: <span className="text-[var(--navy)] dark:text-white font-black">get our students to the top of the world leaderboard.</span></p>
              </div>
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div>
                  <p className="text-3xl font-black text-[var(--navy)] dark:text-white">500+</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">Students</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[var(--navy)] dark:text-white">40+</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">A* Cohorts</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[var(--navy)] dark:text-white">6</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">Countries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission/Vision/Values */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">WHAT DRIVES US</p>
            <h2 className="text-5xl font-black text-[var(--navy)] dark:text-white">MISSION & VALUES</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-0 border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)]">
            {[
              { icon: <CheckCircle2 />, title: "Our Mission", desc: "To make world-class Cambridge, AP, IB, and SAT coaching accessible to every motivated student globally." },
              { icon: <Globe />, title: "Our Vision", desc: "To become the most recognised online coaching brand, known for producing World Toppers and elite university admits." },
              { icon: <Star />, title: "Our Values", desc: "Results over rhetoric. Radical transparency. Continuous improvement. Genuine care for every student's journey." }
            ].map((item, idx) => (
              <div key={idx} className={`p-12 space-y-6 ${idx !== 2 ? 'border-b md:border-b-0 md:border-r border-[var(--border-subtle)]' : ''}`}>
                <div className="w-12 h-12 bg-[var(--gold)] text-white flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase tracking-widest">{item.title}</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">THE TEAM</p>
            <h2 className="text-5xl font-black text-[var(--navy)] dark:text-white uppercase">Meet Our Teachers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teachers.map((t, idx) => (
              <div key={idx} className="p-8 border border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[10px_10px_0px_var(--navy)] transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-2xl font-black text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-white transition-colors">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="font-black text-[var(--navy)] dark:text-white uppercase tracking-wider">{t.name}</h4>
                    <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[var(--navy)] dark:text-white mb-4">{t.subject}</p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">{t.qual}</p>
                <div className="inline-block px-3 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                  Subject Lead
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toppers strip -- TKT-0183: hidden, not deleted, per explicit user
          instruction ("disable for now... not delete but removed by
          hiding"). Re-enable by uncommenting when there's real data. */}
      {/*
      <section className="py-20 bg-[var(--navy)] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-black mb-12 text-center uppercase tracking-widest">
            OUR <span className="text-[var(--gold)]">WORLD & COUNTRY TOPPERS</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {toppers.map((t, idx) => (
              <div key={idx} className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 hover:bg-[var(--gold)] hover:text-white transition-all cursor-default">
                <span className="text-xl">{t.flag}</span>
                <div>
                  <p className="text-sm font-black uppercase tracking-wider">{t.name}</p>
                  <p className="text-[10px] font-bold text-white/60">{t.score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      <Footer />
    </main>
  );
}

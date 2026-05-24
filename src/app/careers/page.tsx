"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Briefcase, Users, Star, GraduationCap, ArrowRight, ShieldCheck, Zap, Globe, Heart } from "lucide-react";
import { useState } from "react";

const roles = [
  {
    id: "ta",
    icon: <GraduationCap />,
    type: "Academic",
    title: "Teaching Assistant (TA)",
    dept: "Academic Department",
    desc: "Support our lead tutors in delivering sessions. Mark past papers, prepare resources, and run doubt-resolution slots.",
    meta: ["A* in subject required", "10–15 hrs/wk", "Remote"]
  },
  {
    id: "sm",
    icon: <Zap />,
    type: "Marketing",
    title: "Social Media Manager (SM)",
    dept: "Marketing Department",
    desc: "Own our Instagram and LinkedIn presence. Create Reels, carousels, and stories that convert students into achievers.",
    meta: ["Platform Fluency", "10–12 hrs/wk", "Remote"]
  },
  {
    id: "hr",
    icon: <Users />,
    type: "Operations",
    title: "HR & People Coordinator",
    dept: "HR Department",
    desc: "Manage tutor onboarding, contracts, and scheduling. Help build a culture where every team member performs.",
    meta: ["HR Background", "8–10 hrs/wk", "Remote"]
  },
  {
    id: "it",
    icon: <Globe />,
    type: "Technology",
    title: "IT Support & Web Assistant",
    dept: "IT Department",
    desc: "Troubleshoot platform issues, manage GCR setups, and support portal development as the product grows.",
    meta: ["HTML/CSS helpful", "Zoom/GCR Admin", "8–12 hrs/wk"]
  },
  {
    id: "intern",
    icon: <Star />,
    type: "Student Role",
    title: "General Intern",
    dept: "All Departments",
    desc: "Currently a student? Join as an intern and gain hands-on experience across teaching, content, or operations.",
    meta: ["Students Welcome", "Flexible Hours", "Certificate Issued"],
    featured: true
  }
];

export default function CareersPage() {
  const [formState, setFormState] = useState("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    setTimeout(() => setFormState("success"), 1500);
  };

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
            {["Fully Remote", "Results Obsessed", "Fast Growth", "Merit Based Pay", "Global Team", "Cambridge Authorised"].map((v, i) => (
              <div key={i} className="px-6 py-2 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest">{v}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roles.map((role) => (
              <div key={role.id} className={`p-10 border transition-all flex flex-col group ${
                role.featured 
                  ? 'border-[var(--gold)] shadow-[15px_15px_0px_var(--gold-light-bg)] dark:shadow-[15px_15px_0px_var(--gold)]/10' 
                  : 'border-[var(--border-subtle)] hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)]'
              }`}>
                <div className="w-14 h-14 bg-[var(--bg-secondary)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-white transition-colors mb-8">
                  {role.icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)] mb-2">{role.type}</p>
                <h3 className="text-xl font-black text-[var(--navy)] dark:text-white uppercase mb-1">{role.title}</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">{role.dept}</p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 flex-grow">{role.desc}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {role.meta.map((m, i) => (
                    <span key={i} className="text-[9px] font-bold px-2 py-1 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] uppercase tracking-wider">{m}</span>
                  ))}
                </div>
                <a href="#apply" className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white pt-8 border-t border-[var(--border-subtle)] flex justify-between items-center group/link">
                  <span>Apply Now</span>
                  <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                </a>
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
              <a href="#apply" className="inline-block py-4 px-10 bg-[var(--gold)] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">Apply Today</a>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-wider">Start Your Journey</h2>
            <p className="text-[var(--text-muted)] mt-4">Fill in the details below. We reply via WhatsApp within 48 hours.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-12 border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)]">
            {formState === "success" ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-[var(--gold-light-bg)] dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={40} className="text-[var(--gold)]" />
                </div>
                <h3 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase mb-4">Application Received</h3>
                <p className="text-[var(--text-muted)] mb-8">Our team will review your profile and reach out via WhatsApp shortly.</p>
                <button onClick={() => setFormState("idle")} className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] border-b-2 border-[var(--gold)] pb-1">Submit Another</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">First Name</label>
                    <input required type="text" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Last Name</label>
                    <input required type="text" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Email Address</label>
                  <input required type="email" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp Number</label>
                  <input required type="tel" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Role Applying For</label>
                  <select required className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors appearance-none">
                    <option value="" className="bg-white dark:bg-[var(--bg-primary)]">Select Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-[var(--bg-primary)]">{r.title}</option>)}
                    <option value="ambassador" className="bg-white dark:bg-[var(--bg-primary)]">Ambassador Programme</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Why DivergenCIE?</label>
                  <textarea required rows={4} className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors resize-none"></textarea>
                </div>
                <button 
                  disabled={formState === "submitting"}
                  className="w-full py-5 bg-[var(--navy)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--gold)] hover:text-black transition-all disabled:opacity-50"
                >
                  {formState === "submitting" ? "Processing..." : "Submit Application"}
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}

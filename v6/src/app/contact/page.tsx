"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { MessageSquare, Mail, Camera, Link as LinkIcon, MapPin, Send, ShieldCheck, Globe } from "lucide-react";
import { useState } from "react";
import { createLead } from "@/lib/actions/leads";

const regionalContacts = [
  { flag: "🇬🇧", country: "United Kingdom", info: "UK Students", method: "A Level, IGCSE, SAT prep. Payment via Stripe or Wise.", tz: "GMT/BST" },
  { flag: "🇲🇾", country: "Malaysia", info: "MY Students", method: "IGCSE, A Level, IB coaching. Payment via FPX or DuitNow.", tz: "MYT (UTC+8)" },
  { flag: "🇮🇳", country: "India", info: "IN Students", method: "All subjects. Payment via Razorpay or UPI.", tz: "IST (UTC+5:30)" },
  { flag: "🇸🇦", country: "Saudi Arabia", info: "KSA Students", method: "IGCSE, A Level, IB. Payment via Al Rajhi or Mada.", tz: "AST (UTC+3)" },
  { flag: "🇵🇰", country: "Pakistan", info: "PK Students", method: "IGCSE, A Level, IELTS. Payment via EasyPaisa or JazzCash.", tz: "PKT (UTC+5)" },
  { flag: "🌐", country: "International", info: "Global", method: "Payment via Wise or PayPal. Scheduled to your timezone.", tz: "Your Timezone" }
];

export default function ContactPage() {
  const [formState, setFormState] = useState("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("submitting");

    const formData = new FormData(e.currentTarget);
    const fname = formData.get("fname") as string;
    const lname = formData.get("lname") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    const res = await createLead({
      name: `${fname} ${lname}`,
      email: email,
      notes: `[Subject: ${subject}] ${message}`,
      source: "Website Contact Form"
    });

    if (res.success) {
      setFormState("success");
    } else {
      setFormState("idle");
      alert("Error: " + (res.error || "Could not submit enquiry."));
    }
  };

  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white text-center">
        <div className="container mx-auto px-4">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">REACH OUT</p>
          <h1 className="text-6xl md:text-8xl font-black mb-8 uppercase leading-tight">Get In <span className="text-[var(--gold)]">Touch.</span></h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">WhatsApp is the fastest way to reach us. We typically reply within 2 hours.</p>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-16">
            
            {/* Left: Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="p-10 bg-[#128c7e] text-white flex flex-col gap-8 shadow-[15px_15px_0px_rgba(18,140,126,0.1)]">
                <MessageSquare size={40} />
                <div>
                  <h3 className="text-2xl font-black uppercase mb-4">WhatsApp Us</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-8">The fastest way to reach the team. Message us about enrolment, pricing, or any subject query.</p>
                  <a href="https://wa.me/919650675507" target="_blank" rel="noopener" className="inline-block py-4 px-8 bg-white text-[#128c7e] text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all">Message Directly</a>
                </div>
                <div className="pt-8 border-t border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Response SLA: &lt; 2 Hours
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Social Channels</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: <Camera size={14} />, label: "@divergencie_coaching", link: "https://www.instagram.com/divergencie_coaching/" },
                    { icon: <LinkIcon size={14} />, label: "DivergenCIE Coaching", link: "https://www.linkedin.com/company/divergencie-coaching/" }
                  ].map((s, i) => (
                    <a key={i} href={s.link} target="_blank" rel="noopener" className="flex items-center gap-3 px-6 py-3 border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors">
                      {s.icon} {s.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-[var(--bg-secondary)] dark:bg-white/5 border-l-4 border-[var(--gold)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] mb-2">Office Hours</p>
                <p className="text-sm font-bold text-[var(--navy)] dark:text-white uppercase tracking-widest">Mon–Sat, 9am–9pm IST</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="p-12 border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] h-full">
                {formState === "success" ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-[var(--gold-light-bg)] dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                      <ShieldCheck size={40} className="text-[var(--gold)]" />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase mb-4">Enquiry Sent</h3>
                    <p className="text-[var(--text-muted)] mb-8">Our team will get back to you within one business day.</p>
                    <button type="button" onClick={() => setFormState("idle")} className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] border-b-2 border-[var(--gold)] pb-1">Send Another</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase mb-8">General Enquiry</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">First Name</label>
                        <input name="fname" required type="text" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Last Name</label>
                        <input name="lname" required type="text" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Email Address</label>
                      <input name="email" required type="email" className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject</label>
                      <select name="subject" required className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors appearance-none">
                        <option value="" className="bg-white dark:bg-[var(--bg-primary)]">What&apos;s this about?</option>
                        <option value="enrol" className="bg-white dark:bg-[var(--bg-primary)]">Enrolment Enquiry</option>
                        <option value="pricing" className="bg-white dark:bg-[var(--bg-primary)]">Pricing & Packages</option>
                        <option value="trial" className="bg-white dark:bg-[var(--bg-primary)]">Book Free Trial</option>
                        <option value="tech" className="bg-white dark:bg-[var(--bg-primary)]">Portal Support</option>
                        <option value="other" className="bg-white dark:bg-[var(--bg-primary)]">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Message</label>
                      <textarea name="message" required rows={5} className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors resize-none"></textarea>
                    </div>
                    <button 
                      type="submit"
                      disabled={formState === "submitting"}
                      className="w-full py-5 bg-[var(--navy)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--gold)] hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {formState === "submitting" ? "Sending..." : <>Send Enquiry <Send size={14} /></>}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Grid */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-wider">Global Operations</h2>
            <p className="text-[var(--text-muted)] mt-4">We operate in 5+ timezones with localised support.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regionalContacts.map((r, i) => (
              <div key={i} className="p-8 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--navy)] transition-colors group">
                <div className="text-4xl mb-6">{r.flag}</div>
                <h4 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase mb-1">{r.country}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] mb-4">{r.info}</p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">{r.method}</p>
                <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <Globe size={12} /> {r.tz}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="h-96 bg-[var(--navy)] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden group">
             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
             <MapPin size={48} className="text-[var(--gold)] mb-6 relative z-10" />
             <h2 className="text-3xl font-black text-white uppercase relative z-10 mb-4">Globally Remote</h2>
             <p className="text-white/60 max-w-md relative z-10 mb-8">We operate 100% online. Students join from UK, Malaysia, India, Saudi Arabia, and Pakistan.</p>
             <div className="flex gap-6 relative z-10 flex-wrap justify-center">
               {["🇬🇧 United Kingdom","🇲🇾 Malaysia","🇮🇳 India","🇸🇦 Saudi Arabia","🇵🇰 Pakistan"].map(c => (
                 <span key={c} className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white text-xs font-black uppercase tracking-wider">{c}</span>
               ))}
             </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { GraduationCap, CheckCircle2, ArrowRight, Loader2, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdmissionsForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "United Kingdom",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const COUNTRIES = ["United Kingdom","Malaysia","United Arab Emirates","Bangladesh","United States","Singapore","Pakistan","Other"];

  const STEPS = [
    { n: 1, title: "Apply Below", desc: "Fill out the short form. Takes 2 minutes." },
    { n: 2, title: "Consultation Call", desc: "Our team contacts you within 24 hours to discuss your goals." },
    { n: 3, title: "Trial Session", desc: "Join a complimentary session with your assigned tutor." },
    { n: 4, title: "Enrol", desc: "Choose your package and start your journey to A*." },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referralCode: refCode || undefined }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Submission failed");
      }

      // Mark referral click as enquiry if ref code
      if (refCode) {
        const ref = await fetch(`/api/referrals?code=${encodeURIComponent(refCode)}`);
        if (ref.ok) {
          const { referral } = await ref.json();
          if (referral) {
            await fetch("/api/referrals", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referralId: referral.id, convertedToEnquiry: true }),
            });
          }
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="py-24 px-6 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-3">Application Received!</h2>
      <p className="text-[var(--text-muted)] text-sm">Our team will contact you within 24 hours. Check your inbox for a confirmation email.</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Full Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full p-3 border border-[var(--border-subtle)] bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full p-3 border border-[var(--border-subtle)] bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+44 7700 000000"
              className="w-full p-3 border border-[var(--border-subtle)] bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Country *</label>
            <select required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full p-3 border border-[var(--border-subtle)] bg-white dark:bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm">
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Tell us about your goals</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
              placeholder="Which subjects? Which exams? What are you aiming for?"
              className="w-full p-3 border border-[var(--border-subtle)] bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm resize-none" />
          </div>
          {refCode && (
            <div className="col-span-2">
              <p className="text-xs text-[var(--gold)] font-bold">Referral code applied: <span className="font-mono">{refCode}</span></p>
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-4 bg-[var(--navy)] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit Application
        </button>
      </form>
    </div>
  );
}

export default function AdmissionsPage() {
  const STEPS = [
    { n: 1, title: "Apply Below", desc: "Fill out the short form. Takes 2 minutes." },
    { n: 2, title: "Consultation Call", desc: "Our team contacts you within 24 hours to discuss your goals." },
    { n: 3, title: "Trial Session", desc: "Join a complimentary session with your assigned tutor." },
    { n: 4, title: "Enrol", desc: "Choose your package and start your journey to A*." },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      <section className="bg-[var(--navy)] text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[var(--gold)] text-xs font-black uppercase tracking-widest mb-4">Applications Open</p>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 leading-none">
            Join <span className="text-[var(--gold)]">DivergenCIE</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            IGCSE · A Level · SAT/ACT · University Preparation. Small groups, expert tutors, A* results.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map(step => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black flex items-center justify-center text-lg font-black mx-auto mb-4">{step.n}</div>
                <p className="font-black text-xs uppercase tracking-widest text-[var(--navy)] dark:text-white mb-1">{step.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white dark:bg-[var(--navy)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight text-center mb-2">Apply Now</h2>
          <p className="text-[var(--text-muted)] text-sm text-center mb-10">Free trial session. No payment required to apply.</p>
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--gold)]" /></div>}>
            <AdmissionsForm />
          </Suspense>
        </div>
      </section>

      <Footer />
    </main>
  );
}

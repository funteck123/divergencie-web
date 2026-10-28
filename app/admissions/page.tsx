"use client";

import SearchSelect from "@/components/SearchSelect";
import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { GraduationCap, CheckCircle2, ArrowRight, Loader2, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const COUNTRIES = ["United Kingdom","Malaysia","United Arab Emirates","Saudi Arabia","Qatar","Bangladesh","India","Pakistan","United States","Singapore","Other"];
const LEVELS = ["IGCSE / O Levels","AS Level","A2 (A Level)","AP","IB","SAT","SAT Subject Tests","Qudurat / GAT","Tahsili / SAAT","IELTS","TOEFL","CBSE","JEE","NEET","CUET","GMAT","OCR","Edexcel","AQA","Other"];
const HELP = ["Classes","Study resources"];
const SUBJECTS = ["Mathematics","Further Mathematics","Additional Mathematics","Statistics","Physics","Chemistry","Biology","Combined Science","English Language","English Literature","English as a Second Language","General Paper","Computer Science","ICT","Business","Economics","Accounting","Psychology","Sociology","Geography","History","Urdu","Arabic","Islamiyat","Pakistan Studies","French","Spanish","German","SAT Math","SAT Reading and Writing","ACT","IELTS","TOEFL","Qudurat","Tahsili"];
const HEARD = ["Social media","Referral","Newspaper","Other"];

const LABEL = "block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1";
const INPUT = "w-full p-3 border border-[var(--border-subtle)] bg-transparent rounded-xl outline-none focus:border-[var(--gold)] text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-[var(--border-subtle)] pt-6 first:border-0 first:pt-0">
      <legend className="text-xs font-black uppercase tracking-widest text-[var(--gold)] mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={checked} onChange={onChange} className="accent-[var(--gold)]" />{label}</label>
  );
}


function AdmissionsForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [form, setForm] = useState({
    name: "", gender: "", country: "United Kingdom", location: "", whatsapp: "", email: "", school: "",
    parentPhone: "", parentEmail: "",
    level: "", help: [] as string[], subjects: [] as string[], otherSubjects: "",
    referrer: "", heardAbout: "", coupon: "", scoreAStar: "", message: "", consent: false,
    website: "",   // hidden field: people never fill it in, bots do
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k: "help" | "subjects", v: string) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TKT-0261: this form used to post to /api/admissions, which does not exist (404), so every submission failed. It posts to the public lead
      // endpoint (the contact form uses it too): it saves the lead and emails the team. The referral code travels in the notes.
      const notes = [form.message, refCode ? `Referral code: ${refCode}` : ""].filter(Boolean).join("\n");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, notes, phone: form.whatsapp, source: "Web Admissions Form",
          utmSource: searchParams.get("utm_source") ?? "", utmMedium: searchParams.get("utm_medium") ?? "", utmCampaign: searchParams.get("utm_campaign") ?? "",
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Submission failed");
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
      <p className="text-[var(--text-muted)] text-sm">Our team will contact you within 24 hours.</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hidden from people (off-screen, not tabbable); a bot that fills it is ignored by the server. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set("website", e.target.value)} /></label>
        </div>

        <Section title="About the student">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Student name *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Gender</label>
              <SearchSelect aria-label="Gender" value={form.gender} onChange={e => set("gender", e.target.value)} className={INPUT + " bg-white dark:bg-transparent"}>
                <option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option>
              </SearchSelect>
            </div>
            <div>
              <label className={LABEL}>Country *</label>
              <SearchSelect aria-label="Country" required value={form.country} onChange={e => set("country", e.target.value)} className={INPUT + " bg-white dark:bg-transparent"}>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </SearchSelect>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>City / location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="City" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>WhatsApp (with country code) *</label>
              <input required type="tel" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="+44 7700 900123" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Student email *</label>
              <input required type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>School</label>
              <input value={form.school} onChange={e => set("school", e.target.value)} placeholder="School name" className={INPUT} />
            </div>
          </div>
        </Section>

        <Section title="Parent or guardian">
          <p className="text-xs text-[var(--text-muted)] -mt-2">If you are over 18, enter your own details.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Contact number (with country code) *</label>
              <input required type="tel" value={form.parentPhone} onChange={e => set("parentPhone", e.target.value)} placeholder="+44 7700 900456" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={form.parentEmail} onChange={e => set("parentEmail", e.target.value)} placeholder="parent@example.com" className={INPUT} />
            </div>
          </div>
        </Section>

        <Section title="What are you studying?">
          <div>
            <label className={LABEL}>Level or exam *</label>
            <SearchSelect aria-label="Level or exam" required value={form.level} onChange={e => set("level", e.target.value)} className={INPUT + " bg-white dark:bg-transparent"}>
              <option value="">Choose one</option>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </SearchSelect>
          </div>
          <div>
            <p className={LABEL}>How can we help?</p>
            <div className="flex gap-6">{HELP.map(h => <Check key={h} label={h} checked={form.help.includes(h)} onChange={() => toggle("help", h)} />)}</div>
          </div>
          <div>
            <p className={LABEL}>Subjects</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">{SUBJECTS.map(sj => <Check key={sj} label={sj} checked={form.subjects.includes(sj)} onChange={() => toggle("subjects", sj)} />)}</div>
            <input value={form.otherSubjects} onChange={e => set("otherSubjects", e.target.value)} placeholder="Other subjects" className={INPUT + " mt-3"} />
          </div>
          <div>
            <label className={LABEL}>Tell us about your goals</label>
            <textarea value={form.message} onChange={e => set("message", e.target.value)} rows={3}
              placeholder="Which exams? What are you aiming for?" className={INPUT + " resize-none"} />
          </div>
          <div>
            <p className={LABEL}>Can you score an A* with proper guidance?</p>
            <div className="flex gap-6">
              {["Yes", "No"].map(v => <label key={v} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="astar" checked={form.scoreAStar === v} onChange={() => set("scoreAStar", v)} className="accent-[var(--gold)]" />{v}</label>)}
            </div>
          </div>
        </Section>

        <Section title="How did you find us?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>How did you hear about us? *</label>
              <SearchSelect aria-label="How did you hear about us" required value={form.heardAbout} onChange={e => set("heardAbout", e.target.value)} className={INPUT + " bg-white dark:bg-transparent"}>
                <option value="">Choose one</option>
                {HEARD.map(h => <option key={h}>{h}</option>)}
              </SearchSelect>
            </div>
            <div>
              <label className={LABEL}>Referred by (name)</label>
              <input value={form.referrer} onChange={e => set("referrer", e.target.value)} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Coupon code</label>
              <input value={form.coupon} onChange={e => set("coupon", e.target.value)} className={INPUT} />
            </div>
          </div>
          {refCode && <p className="text-xs text-[var(--gold)] font-bold">Referral code applied: <span className="font-mono">{refCode}</span></p>}
        </Section>

        <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={e => set("consent", e.target.checked)} className="accent-[var(--gold)] mt-0.5" />
          <span>I agree that DivergenCIE may contact me and my parent or guardian about classes, and store these details as described in the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-[var(--gold)]">Privacy Policy</a>. *</span>
        </label>
        {error && <p role="alert" className="text-red-500 text-xs">{error}</p>}
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

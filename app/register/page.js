"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { api } from "@/lib/client";
import { COUNTRY_CODE_GROUPS, DEFAULT_COUNTRY_DIAL } from "@/lib/countryCodes";

const REQUESTED_TYPE_LABEL = {
  Trial: "trial",
  TeacherInterview: "teacher interview",
  StaffInterview: "staff interview",
  AmbassadorInterview: "ambassador interview",
};

// TKT-0225: restyled to match login/page.js's visual system (same navy
// split-panel layout, same gold/navy brand tokens, same input/button
// treatment) -- the form fields and submit logic themselves are
// unchanged from before this ticket. The left brand panel is
// deliberately shorter than login's (no numeric stat grid or named
// testimonial) rather than inventing new unverified claims for a second
// page; it's still the same structural/visual language.
// No width utility here on purpose -- the WhatsApp row needs the select
// and number input to size differently (flex-none vs flex-1), and a
// baked-in w-full fought that via Tailwind's class-order-dependent
// precedence (found by actually rendering it: the number input collapsed
// to a sliver). Every other field adds `w-full` itself.
const FIELD_CLASS =
  "p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]";

function RegisterForm() {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("requestedType");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryDial, setCountryDial] = useState(DEFAULT_COUNTRY_DIAL);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whyDivergenCIE, setWhyDivergenCIE] = useState("");
  const [resume, setResume] = useState(null);
  const [requestedType, setRequestedType] = useState(
    REQUESTED_TYPE_LABEL[presetType] ? presetType : "Trial"
  );
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("whatsappNumber", `${countryDial} ${whatsappNumber}`.trim());
      formData.set("whyDivergenCIE", whyDivergenCIE);
      formData.set("requestedType", requestedType);
      if (resume) formData.set("resume", resume);
      await api("/api/register", { method: "POST", body: formData });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="h-screen flex items-center justify-center px-4 bg-white dark:bg-[var(--bg-primary)]">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-black uppercase text-[var(--navy)] dark:text-white mb-2">Application submitted</h1>
          <p className="text-[var(--text-muted)] font-medium">
            Management will review your request. If approved, you&apos;ll be given login
            credentials separately to book a {REQUESTED_TYPE_LABEL[requestedType] || requestedType.toLowerCase()} slot.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 py-4 px-8 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex bg-white dark:bg-[var(--bg-primary)] overflow-hidden">
      {/* Left Panel: Brand (Desktop Only) -- same treatment as login,
          shorter content (no numeric stats/testimonial for this ticket's
          scope, see file-level comment above). */}
      <div className="hidden lg:flex flex-1 bg-[var(--navy)] relative overflow-hidden flex-col justify-center px-12 py-[2vh] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,var(--gold)_0%,transparent_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--sky)_0%,transparent_60%)]"></div>
        </div>

        <div className="relative z-10 max-w-lg">
          <Link href="/" className="flex items-center gap-3 mb-[2vh] group">
            <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo" width={40} height={40} className="w-10 h-10 object-cover group-hover:scale-110 transition-transform rounded-lg" />
            <span className="text-xl font-black tracking-tight text-white">Divergen<span className="text-[var(--gold)]">CIE</span></span>
          </Link>

          <h1 className="text-6xl font-black leading-none mb-[1.5vh] uppercase tracking-tight">Join The <span className="text-[var(--gold)]">Team.</span></h1>
          <p className="text-white/60 text-lg font-medium">
            One application for a trial class, or a teacher, staff, or ambassador interview.
            Management reviews every request personally.
          </p>
        </div>
      </div>

      {/* Right Panel: Form */}
      {/* justify-start, not justify-center like login's -- this form has
          6 fields vs. login's 2, so centering it (found by actually
          rendering on a phone-sized viewport) pushed the heading up
          underneath the absolute "Back to site" link instead of below
          it. Top padding clears that link; the longer form scrolls
          naturally from the top instead. */}
      <div className="flex-1 flex flex-col justify-start px-8 md:px-12 pt-20 pb-8 relative overflow-y-auto">
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to site
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-[2vh]">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase mb-2">Apply</h2>
            <p className="text-[var(--text-muted)] font-medium">Tell us a bit about you to get started.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
              <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-[1.5vh]">
            <div className="space-y-2">
              <label className={LABEL_CLASS}>Full name</label>
              <input className={`${FIELD_CLASS} w-full`} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Email</label>
              <input
                type="email"
                className={`${FIELD_CLASS} w-full`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>WhatsApp number</label>
              <div className="flex gap-2">
                <select
                  className={`${FIELD_CLASS} w-auto flex-none`}
                  value={countryDial}
                  onChange={(e) => setCountryDial(e.target.value)}
                  aria-label="Country code"
                >
                  {COUNTRY_CODE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((c) => (
                        <option key={`${group.label}-${c.name}`} value={c.dial}>
                          {c.dial} {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="tel"
                  className={`${FIELD_CLASS} flex-1`}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Number without country code"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Why DivergenCIE? (optional)</label>
              <textarea
                className={`${FIELD_CLASS} w-full`}
                rows={3}
                value={whyDivergenCIE}
                onChange={(e) => setWhyDivergenCIE(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Resume</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className={`${FIELD_CLASS} w-full`}
                onChange={(e) => setResume(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>I&apos;m applying as</label>
              <select className={`${FIELD_CLASS} w-full`} value={requestedType} onChange={(e) => setRequestedType(e.target.value)}>
                <option value="Trial">Trial (Student)</option>
                <option value="TeacherInterview">Interview — Teacher</option>
                <option value="StaffInterview">Interview — Staff</option>
                <option value="AmbassadorInterview">Interview — Ambassador</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? "Submitting…" : "Submit application"}
            </button>
          </form>

          <div className="mt-[2vh]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Already have an account? <Link href="/login" className="text-[var(--gold)] border-b border-[var(--gold)] pb-1 ml-1">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

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

// TKT-0283: the Student form mirrors the public intake form at
// bit.ly/divergencie (Cognito Forms), field for field, in the same order.
// Option lists are copied from study/agent-notes/12-intake-form-full-subject-scope.md.
const STUDYING_OPTIONS = [
  "A2 Levels", "AS Level", "AP", "IGCSE/O-Levels", "IB", "SAT", "Qudurat GAT", "Tahsili SAAT",
  "SAT Subject Tests", "IELTS", "TOEFL", "CBSE", "JEE", "NEET", "CUET", "GMAT", "OCR", "Edexcel", "AQA",
];
const HELP_OPTIONS = ["Classes", "Study Resources"];
const SUBJECT_OPTIONS = [
  "Chemistry", "Physics", "Biology", "Computer Science", "Maths", "ICT", "Islamic Studies",
  "Religious Studies", "PreCalculus", "Calculus", "Hindi", "Arabic", "Urdu", "Environmental Management",
  "French", "Spanish", "German", "Pak. Studies", "Business Studies", "English Literature",
  "English Language", "English as a Second Language", "First Language English", "Economics",
  "Psychology", "Sociology", "History", "Global Perspectives", "Geography", "Art",
  "Further Mathematics", "Drama", "Accounting", "Law", "English General Paper", "IT", "Science",
  "Independent Research",
];
const HEARD_OPTIONS = ["Social Media", "Referral", "Newspaper"];

// Country code select + number. min-w-0 / max-w on the pieces is what stops
// the row from forcing the page wider than a phone (TKT-0283).
function PhoneField({ label, dial, onDial, number, onNumber, required, ariaLabel }) {
  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS}>{label}</label>
      <div className="flex gap-2 min-w-0">
        <select
          className={`${FIELD_CLASS} w-auto flex-none min-w-0 max-w-[38%]`}
          value={dial}
          onChange={(e) => onDial(e.target.value)}
          aria-label={ariaLabel}
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
          className={`${FIELD_CLASS} flex-1 min-w-0`}
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          placeholder="Phone number"
          required={required}
          aria-label={`${label} number`}
        />
      </div>
    </div>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("requestedType");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryDial, setCountryDial] = useState(DEFAULT_COUNTRY_DIAL);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whyDivergenCIE, setWhyDivergenCIE] = useState("");
  const [resume, setResume] = useState(null);
  const [requestedType, setRequestedType] = useState(
    REQUESTED_TYPE_LABEL[presetType] ? presetType : "Trial"
  );
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [parentDial, setParentDial] = useState(DEFAULT_COUNTRY_DIAL);
  const [parentNumber, setParentNumber] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [studying, setStudying] = useState([]);
  const [help, setHelp] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [referrer, setReferrer] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [scoreAStar, setScoreAStar] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStudent = requestedType === "Trial";
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isStudent && studying.length === 0) {
        throw new Error("Please choose at least one option under \"What are you studying?\".");
      }
      const formData = new FormData();
      formData.set("name", isStudent ? `${name} ${lastName}`.trim() : name);
      formData.set("email", email);
      formData.set("whatsappNumber", `${countryDial} ${whatsappNumber}`.trim());
      formData.set("requestedType", requestedType);
      if (isStudent) {
        formData.set("gender", gender);
        formData.set("location", location);
        formData.set("parentContactNumber", `${parentDial} ${parentNumber}`.trim());
        formData.set("parentEmail", parentEmail);
        formData.set("schoolName", schoolName);
        formData.set("studying", studying.join(", "));
        formData.set("help", help.join(", "));
        formData.set("subjects", subjects.join(", "));
        formData.set("referrer", referrer);
        formData.set("heardAbout", heardAbout);
        formData.set("couponCode", couponCode);
        formData.set("scoreAStar", scoreAStar);
      } else {
        formData.set("whyDivergenCIE", whyDivergenCIE);
        if (resume) formData.set("resume", resume);
      }
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
              <label className={LABEL_CLASS}>I&apos;m applying as</label>
              <select className={`${FIELD_CLASS} w-full`} value={requestedType} onChange={(e) => setRequestedType(e.target.value)}>
                <option value="Trial">Trial (Student)</option>
                <option value="TeacherInterview">Interview — Teacher</option>
                <option value="StaffInterview">Interview — Staff</option>
                <option value="AmbassadorInterview">Interview — Ambassador</option>
              </select>
            </div>

            {isStudent ? (
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Student name</label>
                <div className="flex gap-2 min-w-0">
                  <input className={`${FIELD_CLASS} flex-1 min-w-0`} value={name} onChange={(e) => setName(e.target.value)} placeholder="First" aria-label="Student first name" required />
                  <input className={`${FIELD_CLASS} flex-1 min-w-0`} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" aria-label="Student last name" required />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Full name</label>
                <input className={`${FIELD_CLASS} w-full`} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            {isStudent && (
              <>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>Gender (optional)</label>
                  <input className={`${FIELD_CLASS} w-full`} value={gender} onChange={(e) => setGender(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>Location (optional)</label>
                  <input className={`${FIELD_CLASS} w-full`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Country" />
                </div>
              </>
            )}

            <PhoneField
              label="WhatsApp number"
              dial={countryDial}
              onDial={setCountryDial}
              number={whatsappNumber}
              onNumber={setWhatsappNumber}
              required
              ariaLabel="Country code"
            />

            <div className="space-y-2">
              <label className={LABEL_CLASS}>{isStudent ? "Your email" : "Email"}</label>
              <input
                type="email"
                className={`${FIELD_CLASS} w-full`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {isStudent ? (
              <>
                <PhoneField
                  label="Parent's contact number"
                  dial={parentDial}
                  onDial={setParentDial}
                  number={parentNumber}
                  onNumber={setParentNumber}
                  required
                  ariaLabel="Parent country code"
                />
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>Parent&apos;s email (optional)</label>
                  <input type="email" className={`${FIELD_CLASS} w-full`} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>School name (optional)</label>
                  <input className={`${FIELD_CLASS} w-full`} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                </div>
                <fieldset className="space-y-2 min-w-0">
                  <legend className={LABEL_CLASS}>What are you studying? (choose at least one)</legend>
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2 pt-1 border border-[var(--border-subtle)] p-3">
                    {STUDYING_OPTIONS.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-medium min-w-0">
                        <input type="checkbox" checked={studying.includes(o)} onChange={() => toggle(studying, setStudying, o)} /> <span className="min-w-0">{o}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2 min-w-0">
                  <legend className={LABEL_CLASS}>How shall we help? (optional)</legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                    {HELP_OPTIONS.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={help.includes(o)} onChange={() => toggle(help, setHelp, o)} /> {o}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2 min-w-0">
                  <legend className={LABEL_CLASS}>Subjects (optional)</legend>
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2 pt-1 max-h-64 overflow-y-auto border border-[var(--border-subtle)] p-3">
                    {SUBJECT_OPTIONS.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-medium min-w-0">
                        <input type="checkbox" checked={subjects.includes(o)} onChange={() => toggle(subjects, setSubjects, o)} /> <span className="min-w-0">{o}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>Who referred you? (optional, referrer name)</label>
                  <input className={`${FIELD_CLASS} w-full`} value={referrer} onChange={(e) => setReferrer(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>How did you hear about us?</label>
                  <select className={`${FIELD_CLASS} w-full`} value={heardAbout} onChange={(e) => setHeardAbout(e.target.value)} required>
                    <option value="">Select</option>
                    {HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={LABEL_CLASS}>Coupon code (optional)</label>
                  <input className={`${FIELD_CLASS} w-full`} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                </div>
                <fieldset className="space-y-2 min-w-0">
                  <legend className={LABEL_CLASS}>Do you feel you can score A* with proper guidance?</legend>
                  <div className="flex gap-6 pt-1">
                    {["Yes", "No"].map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-medium">
                        <input type="radio" name="scoreAStar" checked={scoreAStar === o} onChange={() => setScoreAStar(o)} /> {o}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : (
              <>
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
              </>
            )}

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

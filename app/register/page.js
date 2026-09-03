"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { COUNTRY_CODE_GROUPS, DEFAULT_COUNTRY_DIAL } from "@/lib/countryCodes";

const REQUESTED_TYPE_LABEL = {
  Trial: "trial",
  TeacherInterview: "teacher interview",
  StaffInterview: "staff interview",
  AmbassadorInterview: "ambassador interview",
};

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
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm text-center">
          <h1 className="text-xl font-semibold mb-2">Application submitted</h1>
          <p style={{ color: "var(--muted)" }}>
            Management will review your request. If approved, you&apos;ll be given login
            credentials separately to book a {REQUESTED_TYPE_LABEL[requestedType] || requestedType.toLowerCase()} slot.
          </p>
          <a href="/login" className="btn inline-block mt-4">
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-sm tracking-widest uppercase" style={{ color: "var(--muted)" }}>
            DCP1
          </div>
          <h1 className="text-2xl font-semibold mt-1">Apply</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Full name
            </label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              WhatsApp number
            </label>
            <div className="flex gap-2">
              <select
                className="field"
                style={{ flex: "0 0 auto", width: "auto" }}
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
                className="field"
                style={{ flex: 1 }}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Number without country code"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Why DivergenCIE? (optional)
            </label>
            <textarea
              className="field"
              rows={3}
              value={whyDivergenCIE}
              onChange={(e) => setWhyDivergenCIE(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Resume (optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="field"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              I&apos;m applying as
            </label>
            <select
              className="field"
              value={requestedType}
              onChange={(e) => setRequestedType(e.target.value)}
            >
              <option value="Trial">Trial (Student)</option>
              <option value="TeacherInterview">Interview — Teacher</option>
              <option value="StaffInterview">Interview — Staff</option>
              <option value="AmbassadorInterview">Interview — Ambassador</option>
            </select>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--bad)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? "Submitting…" : "Submit application"}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          <a href="/login" className="underline" style={{ color: "var(--accent-2)" }}>
            Already have an account? Sign in
          </a>
        </p>
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

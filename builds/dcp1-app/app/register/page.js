"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedType, setRequestedType] = useState("Trial");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, requestedType }),
      });
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
            credentials separately to book a {requestedType.toLowerCase()} slot.
          </p>
          <a href="/" className="btn inline-block mt-4">
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
              Email (optional)
            </label>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <option value="Interview">Interview (Staff)</option>
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
          <a href="/" className="underline" style={{ color: "var(--accent-2)" }}>
            Already have an account? Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

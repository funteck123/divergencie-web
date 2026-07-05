"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setCurrentUser, roleHomePath } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setCurrentUser(user);
      router.push(roleHomePath(user.UserType));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-sm tracking-widest uppercase" style={{ color: "var(--muted)" }}>
            DCP1
          </div>
          <h1 className="text-2xl font-semibold mt-1">Education Management</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Username
            </label>
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--bad)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          New here?{" "}
          <a href="/register" className="underline" style={{ color: "var(--accent-2)" }}>
            Apply for a trial or interview
          </a>
        </p>
      </div>
    </main>
  );
}

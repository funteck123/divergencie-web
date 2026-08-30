"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, setCurrentUser, roleHomePath } from "@/lib/client";

// UI copied verbatim from v6's src/app/auth/login/page.tsx (same brand
// tokens, same layout/markup), minus the Google sign-in button — adapted
// underneath to v7's actual auth: accounts log in with a Username (e.g.
// "andrewparent"), not an email address, and there's no NextAuth here, so
// the field/label/input-type changed from Email to Username and the
// submit handler calls dcp1-app's own /api/login instead of signIn().
export default function LoginPage() {
  // TKT-0157: defaults to visible now (not hidden) -- the toggle stays for
  // anyone who prefers to mask it on a shared screen, it just no longer
  // starts that way.
  const [showPassword, setShowPassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
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
    <main className="h-screen flex bg-white dark:bg-[var(--bg-primary)] overflow-hidden">
      {/* Left Panel: Brand & Stats (Desktop Only) */}
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

          <h1 className="text-6xl font-black leading-none mb-[1.5vh] uppercase tracking-tight">Your A* Journey Starts <span className="text-[var(--gold)]">Here.</span></h1>
          <p className="text-white/60 text-lg mb-[2vh] font-medium">Access your personalised dashboard to track progress, attend sessions, and close your A* gaps.</p>

          <div className="grid grid-cols-3 gap-8 mb-[2vh]">
            {[
              { val: "40+", label: "Toppers" },
              { val: "98%", label: "A* Rate" },
              { val: "5+", label: "Countries" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl font-black text-[var(--gold)]">{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="p-[1.5vh] px-6 border border-white/10 bg-white/5 backdrop-blur-sm">
            <p className="text-white/80 italic mb-[1.5vh] leading-relaxed">&quot;The portal made it so easy to track my past paper scores and see exactly which topics I needed to fix. Went from a 6 to a 9 in IGCSE Maths.&quot;</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--gold)]/20 border border-[var(--gold)] flex items-center justify-center font-black text-[var(--gold)] text-xs">AR</div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Aanya R.</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">IGCSE Student · Grade 9</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-[2vh] relative overflow-y-auto">
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to site
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-[2vh]">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase mb-2">Welcome Back</h2>
            <p className="text-[var(--text-muted)] font-medium">Sign in to your DivergenCIE portal.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
              <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-[1.5vh]">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                placeholder="your-username"
                className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Password</label>
                <a href="mailto:divergenCIE@outlook.com" title="Forgot Password" className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">Forgot?</a>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 pr-12 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" id="remember" className="w-4 h-4 accent-[var(--gold)]" />
              <label htmlFor="remember" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] cursor-pointer">Remember me</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? "Verifying..." : "Portal Login"}
            </button>
          </form>

          <div className="mt-[2vh]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Don&apos;t have an account? <Link href="/register" className="text-[var(--gold)] border-b border-[var(--gold)] pb-1 ml-1">Apply for a trial or interview</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Star, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth v5 custom error codes are usually in the error string or handled via throw
        // We'll check the error code returned
        if (result.error.includes("account_inactive")) {
          setErrorMsg("This account has been deactivated. Please contact HR or your supervisor.");
        } else if (result.error.includes("invalid_credentials") || result.error === "CredentialsSignin") {
          setErrorMsg("Invalid email or password. Please try again.");
        } else {
          setErrorMsg("An unexpected error occurred during login.");
        }
        setFormState("idle");
      } else {
        router.push("/portal");
      }
    } catch (error) {
      setErrorMsg("Connection error. Please check your internet.");
      setFormState("idle");
    }
  };

  return (
    <main className="min-h-screen flex bg-white dark:bg-[var(--bg-primary)] overflow-hidden">
      
      {/* Left Panel: Brand & Stats (Desktop Only) */}
      <div className="hidden lg:flex flex-1 bg-[var(--navy)] relative overflow-hidden flex-col justify-center p-20 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,var(--gold)_0%,transparent_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--sky)_0%,transparent_60%)]"></div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="flex items-center gap-3 mb-20 group">
            <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo" width={40} height={40} className="w-10 h-10 object-cover group-hover:scale-110 transition-transform rounded-lg" />
            <span className="text-xl font-black tracking-tight text-white">Divergen<span className="text-[var(--gold)]">CIE</span></span>
          </Link>

          <h1 className="text-6xl font-black leading-none mb-8 uppercase tracking-tight">Your A* Journey Starts <span className="text-[var(--gold)]">Here.</span></h1>
          <p className="text-white/60 text-lg mb-16 font-medium">Access your personalised dashboard to track progress, attend sessions, and close your A* gaps.</p>

          <div className="grid grid-cols-3 gap-8 mb-20">
            {[
              { val: "40+", label: "Toppers" },
              { val: "98%", label: "A* Rate" },
              { val: "5+", label: "Countries" }
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl font-black text-[var(--gold)]">{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="p-8 border border-white/10 bg-white/5 backdrop-blur-sm">
            <p className="text-white/80 italic mb-6 leading-relaxed">&quot;The portal made it so easy to track my past paper scores and see exactly which topics I needed to fix. Went from a 6 to a 9 in IGCSE Maths.&quot;</p>
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
      <div className="flex-1 flex flex-col justify-center p-8 md:p-20 relative">
        <Link href="/" className="absolute top-12 left-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to site
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase mb-2">Welcome Back</h2>
            <p className="text-[var(--text-muted)] font-medium">Sign in to your DivergenCIE portal.</p>
          </div>

          {errorMsg && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
              <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Email Address</label>
              <input 
                required 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Password</label>
                <Link href="/auth/forgot-password" title="Forgot Password" className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">Forgot?</Link>
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
              disabled={formState === "loading"}
              className="w-full py-4 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
            >
              {formState === "loading" ? "Verifying..." : "Portal Login"}
            </button>
          </form>

          <div className="mt-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px bg-[var(--border-subtle)]"></div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] lowercase">or continue with</span>
              <div className="flex-1 h-px bg-[var(--border-subtle)]"></div>
            </div>
            <button 
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/portal" })}
              className="w-full py-4 border border-[var(--border-subtle)] flex items-center justify-center gap-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors rounded-xl"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            <p className="mt-12 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Don&apos;t have an account? <Link href="/contact" className="text-[var(--gold)] border-b border-[var(--gold)] pb-1 ml-1">Contact us to enrol</Link>
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}

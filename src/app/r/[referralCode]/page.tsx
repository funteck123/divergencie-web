"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Award, ArrowRight, Users, GraduationCap, Star, CheckCircle2, Loader2 } from "lucide-react";

export default function ReferralLandingPage() {
  const params = useParams();
  const referralCode = params.referralCode as string;
  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!referralCode) return;

    // Fetch referral info + log click
    fetch(`/api/referrals?code=${encodeURIComponent(referralCode)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setReferral(data.referral);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load referral"); setLoading(false); });
  }, [referralCode]);

  const PERKS = [
    { icon: <Star size={16} />, text: "A* Results — our students average 85th percentile" },
    { icon: <GraduationCap size={16} />, text: "Expert tutors from Oxford, Cambridge, and Imperial" },
    { icon: <Users size={16} />, text: "Small groups and 1-on-1 coaching available" },
    { icon: <CheckCircle2 size={16} />, text: "Free trial session — no commitment" },
  ];

  if (loading) return (
    <main className="min-h-screen">
      <Nav />
      <div className="flex justify-center items-center py-48">
        <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
      </div>
      <Footer />
    </main>
  );

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />

      <section className="relative bg-[var(--navy)] text-white py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {referral && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 text-[var(--gold)] text-xs font-black uppercase tracking-widest mb-8">
              <Award size={14} />
              Referred by {referral.referrer?.name ?? "a DivergenCIE Ambassador"}
            </div>
          )}
          {error && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest mb-8">
              Special invitation link
            </div>
          )}
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 leading-none">
            You've been<br /><span className="text-[var(--gold)]">Invited</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-10">
            Join DivergenCIE — the tutoring centre trusted by A* students across the UK, Malaysia, UAE, and Bangladesh. Your ambassador has unlocked a complimentary first session.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/admissions"
              className="px-8 py-4 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-full hover:opacity-90 flex items-center gap-2">
              Apply Now <ArrowRight size={16} />
            </Link>
            <Link href="/services"
              className="px-8 py-4 border border-white/20 text-white text-sm font-black uppercase tracking-widest rounded-full hover:bg-white/10">
              View Services
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white dark:bg-[var(--navy)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight text-center mb-12">
            Why DivergenCIE?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-start gap-4 p-6 border border-[var(--border-subtle)] rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center shrink-0 text-[var(--gold)]">
                  {perk.icon}
                </div>
                <p className="text-sm font-bold text-[var(--navy)] dark:text-white leading-relaxed">{perk.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight mb-4">
            Ready to Diverge?
          </h2>
          <p className="text-[var(--text-muted)] text-sm mb-8">
            Use code <span className="font-mono font-black text-[var(--gold)]">{referralCode}</span> when applying to unlock your complimentary session.
          </p>
          <Link href={`/admissions?ref=${referralCode}`}
            className="inline-flex items-center gap-2 px-10 py-5 bg-[var(--navy)] dark:bg-[var(--gold)] text-white dark:text-black text-sm font-black uppercase tracking-widest rounded-full hover:opacity-90">
            Apply Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

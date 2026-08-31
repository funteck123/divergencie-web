"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Check, ShieldCheck, Zap, Star, CreditCard, HelpCircle, X, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const PRICING_DATA: Record<string, any> = {
  GBP: { symbol: "£", t1: "120", t2: "180", t3: "280" },
  MYR: { symbol: "RM", t1: "650", t2: "950", t3: "1500" },
  INR: { symbol: "₹", t1: "12k", t2: "18k", t3: "28k" },
  SAR: { symbol: "SR", t1: "550", t2: "850", t3: "1350" },
  USD: { symbol: "$", t1: "150", t2: "220", t3: "350" }
};

const tiers = [
  {
    id: "t1",
    tier: "TIER 1",
    name: "Foundations",
    period: "2 live sessions per week · ~8 sessions/month",
    desc: "For students building their base and targeting B–A grades.",
    features: [
      { text: "2 × 1-hr live sessions/week", included: true },
      { text: "Past paper access (topical + yearly)", included: true },
      { text: "WhatsApp doubt resolution (48hr)", included: true },
      { text: "Monthly progress report", included: true },
      { text: "Access to student portal", included: true }
    ],
    button: "ENQUIRE NOW",
    accent: "var(--navy)"
  },
  {
    id: "t2",
    tier: "TIER 2",
    name: "A* Track",
    period: "3 live sessions per week · ~12 sessions/month",
    desc: "For students targeting A* and top university offers.",
    features: [
      { text: "3 × 1-hr live sessions/week", included: true },
      { text: "Session recordings in student portal", included: true },
      { text: "Past paper access (topical + yearly)", included: true },
      { text: "WhatsApp doubt resolution (24hr)", included: true },
      { text: "Monthly progress report", included: true },
      { text: "Access to student portal", included: true },
      { text: "A* Progress Tracker", included: true },
      { text: "Predicted papers", included: true }
    ],
    button: "ENQUIRE NOW",
    popular: true,
    accent: "var(--gold)"
  },
  {
    id: "t3",
    tier: "TIER 3",
    name: "World Topper",
    period: "Daily sessions + extras · maximum intensity",
    desc: "For students chasing World / Country Topper rankings.",
    features: [
      { text: "Daily live sessions (5×/week)", included: true },
      { text: "Session recordings in student portal", included: true },
      { text: "Past paper access (topical + yearly)", included: true },
      { text: "Priority doubt resolution (4hr)", included: true },
      { text: "Weekly progress report", included: true },
      { text: "Access to student portal", included: true },
      { text: "A* Progress Tracker", included: true },
      { text: "Predicted papers (exclusive)", included: true },
      { text: "Dedicated subject specialist", included: true }
    ],
    scholarshipLabel: "We are looking for talented students, scholarships available",
    button: "ENQUIRE NOW",
    accent: "var(--navy)"
  }
];

const paymentMethods = [
  { flagUrl: "https://flagcdn.com/w80/gb.png", country: "United Kingdom", methods: ["Stripe Visa", "Debit/Credit Card", "Bank Transfer"] },
  { flagUrl: "https://flagcdn.com/w80/us.png", country: "United States", methods: ["Stripe Visa", "PayPal", "Bank Wire"] },
  { flagUrl: "https://flagcdn.com/w80/ae.png", country: "UAE", methods: ["Stripe Visa", "Bank Transfer"] },
  { flagUrl: "https://flagcdn.com/w80/sg.png", country: "Singapore", methods: ["Stripe Visa", "PayPal", "PayNow"] },
  { flagUrl: "https://flagcdn.com/w80/my.png", country: "Malaysia", methods: ["FPX", "DuitNow", "Online Banking"] },
  { flagUrl: "https://flagcdn.com/w80/in.png", country: "India", methods: ["Razorpay", "UPI", "Net Banking"] },
  { flagUrl: "https://flagcdn.com/w80/sa.png", country: "Saudi Arabia", methods: ["Al Rajhi Bank", "STC Pay", "Mada", "Western Union"] },
  { flagUrl: "https://flagcdn.com/w80/pk.png", country: "Pakistan", methods: ["EasyPaisa", "JazzCash", "Bank Transfer"] },
  { isGlobal: true, country: "International", methods: ["Wise", "PayPal", "SWIFT Transfer"] },
];

const faqs = [
  { q: "Is there a free trial session?", a: "Yes, we offer a free 30-minute diagnostic session for all new students." },
  { q: "When do I pay: before or after sessions?", a: "Payment is collected monthly in advance at the start of each billing cycle." },
  { q: "Can I switch tiers mid-way through?", a: "Yes. You can upgrade or downgrade your tier at the end of any billing month." },
  { q: "What happens if I miss a session?", a: "Life happens. Missed sessions can be rescheduled with at least 12 hours' notice." },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currency, setCurrency] = useState({ symbol: "£", code: "GBP", data: PRICING_DATA.GBP });

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Kuala_Lumpur")) setCurrency({ symbol: "RM", code: "MYR", data: PRICING_DATA.MYR });
    else if (tz.includes("Asia/Kolkata")) setCurrency({ symbol: "₹", code: "INR", data: PRICING_DATA.INR });
    else if (tz.includes("Riyadh")) setCurrency({ symbol: "SR", code: "SAR", data: PRICING_DATA.SAR });
    else if (tz.includes("America")) setCurrency({ symbol: "$", code: "USD", data: PRICING_DATA.USD });
  }, []);

  return (
    <main className="bg-white dark:bg-[var(--bg-primary)]">
      <Nav />
      
      {/* Hero */}
      <section className="pt-48 pb-24 bg-[var(--navy)] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--gold)_0%,transparent_70%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-6">INVEST IN EXCELLENCE</p>
          <h1 className="text-6xl md:text-8xl font-black mb-8 uppercase">Simple, <span className="text-[var(--gold)]">Transparent.</span></h1>
          <p className="max-w-2xl mx-auto text-lg text-white/80 font-medium">No hidden fees. Localised payment options. World-class results.</p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-24 -mt-12 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {tiers.map((tier, idx) => (
              <div 
                key={idx} 
                className={`relative p-12 border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] transition-all hover:-translate-y-2 flex flex-col ${
                  tier.popular ? 'border-[var(--gold)] shadow-[20px_20px_0px_var(--gold-light-bg)] dark:shadow-[20px_20px_0px_var(--gold)]/10 z-10' : 'hover:border-[var(--navy)] hover:shadow-[15px_15px_0px_var(--navy)]'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-white px-6 py-1 text-[10px] font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)] mb-2">{tier.tier}</p>
                <h3 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase mb-4">{tier.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mb-10 leading-relaxed">{tier.desc}</p>
                
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--text-muted)]">{currency.symbol}</span>
                  <span className="text-6xl font-black text-[var(--navy)] dark:text-white">{(currency.data as any)[tier.id]}</span>
                  <span className="text-xs font-black text-[var(--text-muted)] ml-2">/MONTH</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-12 border-b border-[var(--border-subtle)] pb-8 leading-loose">{tier.period}</p>

                <div className="space-y-4 mb-12 flex-grow">
                  {tier.features.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 flex items-center justify-center ${f.included ? 'bg-[var(--gold-light-bg)] dark:bg-white/5' : ''}`}>
                        {f.included ? <Check size={12} className="text-[var(--gold)]" /> : <X size={12} className="text-[var(--text-muted)] opacity-40" />}
                      </div>
                      <span className={`text-sm font-bold ${f.included ? 'text-[var(--navy)] dark:text-white' : 'text-[var(--text-muted)] opacity-40'}`}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {tier.scholarshipLabel && (
                  <div className="mb-8 p-4 bg-[var(--navy)] text-white text-[9px] font-black uppercase tracking-[0.2em] text-center border-y border-[var(--gold)]/30">
                    {tier.scholarshipLabel}
                  </div>
                )}

                <Link href="/contact" className={`w-full py-5 text-center text-xs font-black uppercase tracking-widest border-2 transition-all ${
                  tier.popular 
                    ? 'bg-[var(--gold)] border-[var(--gold)] text-white hover:bg-transparent hover:text-[var(--gold)]' 
                    : 'border-[var(--navy)] text-[var(--navy)] dark:border-white dark:text-white hover:bg-[var(--navy)] hover:text-white dark:hover:bg-white dark:hover:text-black'
                }`}>
                  {tier.button}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-24 bg-[var(--bg-secondary)] dark:bg-white/5">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-[10px] mb-4">PAY YOUR WAY</p>
            <h2 className="text-4xl md:text-5xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Local Payment Methods,<br /><span className="text-[var(--gold)]">Every Region</span></h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paymentMethods.map((m, idx) => (
              <div key={idx} className="p-10 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:shadow-xl transition-all">
                <div className="flex justify-between items-start mb-8">
                  {m.isGlobal ? <Globe size={32} className="text-[var(--gold)]" /> : <Image src={m.flagUrl} alt={m.country} width={80} height={60} className="w-10 h-auto shadow-sm" />}
                </div>
                <p className="font-black text-[var(--navy)] dark:text-white uppercase tracking-widest text-sm mb-2">{m.country}</p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{m.methods.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

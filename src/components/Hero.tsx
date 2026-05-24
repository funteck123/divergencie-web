"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Media with Overlay */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover brightness-[0.4]"
        >
          <source src="/assets/videos/hero_video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/80 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <p className="text-xs font-black text-[var(--gold)] tracking-[0.3em] uppercase mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          divergencie.co.uk
        </p>

        {/* Heading */}
        <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.85] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          LET US HELP YOU<br />
          <span className="text-[var(--gold)]">
            ACHIEVE A*!
          </span>
        </h1>

        {/* Subheading */}
        <p className="max-w-3xl text-sm md:text-base text-white font-black tracking-[0.2em] uppercase mb-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          OXFORD & CAMBRIDGE-COACHED
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-16 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
          <Link
            href="/contact"
            className="group flex items-center gap-3 bg-[var(--gold)] px-[33px] py-[17px] rounded-none text-xs font-black text-white tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all"
          >
            <ArrowRight size={14} />
            START YOUR JOURNEY
          </Link>
          
          <Link
            href="#results"
            className="flex items-center gap-3 border-2 border-white px-[33px] py-[17px] rounded-none text-xs font-black text-white tracking-widest uppercase hover:bg-white hover:text-[var(--navy)] transition-all"
          >
            SEE OUR RESULTS
          </Link>
        </div>

      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-[-75px] left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-20">
        <span className="text-[9px] font-black tracking-[0.4em] uppercase text-[var(--gold)] mb-2">SCROLL</span>
        <div className="w-0.5 h-24 bg-[var(--gold)]"></div>
      </div>

      {/* Stats Floating - Hidden on mobile as per mockup usually, or keeping it but styled */}
      <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col gap-4">
        <div className="bg-black/20 backdrop-blur-md border border-white/20 p-6 rounded-xl w-48">
          <p className="text-4xl font-black text-white mb-1">98%</p>
          <p className="text-[10px] font-black text-white/60 tracking-widest uppercase leading-tight">FIRST CHOICE PLACEMENT</p>
        </div>
        <div className="bg-black/20 backdrop-blur-md border border-white/20 p-6 rounded-xl w-48">
          <p className="text-4xl font-black text-white mb-1">40+</p>
          <p className="text-[10px] font-black text-white/60 tracking-widest uppercase leading-tight">COUNTRIES REPRESENTED</p>
        </div>
      </div>
    </section>
  );
}

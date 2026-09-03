"use client";

import { Globe } from "lucide-react";
import Link from "next/link";

// TKT-0221: the 21 real countries DivergenCIE has students in (user-
// confirmed 2026-09-01, cross-checked against live account data -- see
// planning/content-sweep-intermediate-plan.md's "Countries with real
// students" section for the full provenance). UK doubles as the HQ marker
// since it's both a real client country and where DivergenCIE is based --
// not a duplicate, one dot covers both facts.
const locations = [
  { name: "UK", x: 428, y: 72, hq: true },
  { name: "US", x: 175, y: 110 },
  { name: "Cayman Islands", x: 165, y: 245 },
  { name: "Egypt", x: 475, y: 135 },
  { name: "Sudan", x: 480, y: 185 },
  { name: "Nigeria", x: 430, y: 235 },
  { name: "Tanzania", x: 500, y: 270 },
  { name: "South Africa", x: 460, y: 335 },
  { name: "Seychelles", x: 555, y: 290 },
  // This cluster (Middle East through Southeast Asia) is where 11 of the
  // 21 real countries sit close together -- spread wider than their real
  // geography to keep each label readable rather than colliding into an
  // unreadable smear, found by actually rendering a first attempt and
  // looking at it (Saudi Arabia/UAE/Qatar and Sri Lanka/Singapore
  // overlapped into unreadable text). A plain-text list below the map is
  // the reliable, always-readable source for the full 21; this cluster's
  // exact pixel spacing is a readability compromise, not a geography claim.
  { name: "Turkey", x: 545, y: 85 },
  { name: "Saudi Arabia", x: 560, y: 170 },
  { name: "Qatar", x: 605, y: 215 },
  { name: "UAE", x: 650, y: 165 },
  { name: "Pakistan", x: 700, y: 130 },
  { name: "India", x: 730, y: 180 },
  { name: "Bangladesh", x: 790, y: 150 },
  { name: "Sri Lanka", x: 760, y: 225 },
  { name: "Malaysia", x: 830, y: 185 },
  { name: "Singapore", x: 800, y: 235 },
  { name: "Indonesia", x: 860, y: 255 },
  { name: "Australia", x: 800, y: 335 },
];

export default function GlobalReach() {
  return (
    <section className="py-24 bg-[var(--bg-secondary)] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto mb-16">
          <p className="text-[var(--gold)] font-black tracking-[0.3em] uppercase text-xs mb-4">
            WORLDWIDE REACH
          </p>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-[var(--navy)] dark:text-white leading-[0.9] mb-6 break-words w-full">
            DIVERGENCIE<br />GOES <span className="text-[var(--gold)]">GLOBAL.</span>
          </h2>
          <p className="text-sm font-black tracking-[0.2em] text-[var(--text-muted)] uppercase">
            STUDENTS FROM 21 COUNTRIES. ONE STANDARD: EXCEPTIONAL.
          </p>
        </div>

        {/* Map Container - Card styling removed, made larger */}
        <div className="relative w-full aspect-[2/1] max-w-screen-2xl mx-auto mb-8">
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full text-[var(--border-subtle)] fill-current"
            aria-label="World map showing DivergenCIE student locations"
          >
            {/* Simple Map Paths */}
            <path d="M80,80 L200,70 L230,90 L240,130 L220,160 L200,180 L180,200 L160,220 L130,230 L100,220 L80,200 L60,170 L55,140 L65,110 Z" />
            <path d="M150,230 L175,225 L185,245 L170,260 L150,255 Z" />
            <path d="M160,270 L220,255 L250,270 L260,310 L255,360 L230,400 L200,420 L175,410 L155,380 L145,340 L140,300 L145,275 Z" />
            <path d="M430,60 L500,55 L520,70 L510,100 L490,115 L460,120 L435,110 L420,90 Z" />
            <path d="M415,65 L430,60 L435,75 L425,85 L412,80 Z" />
            <path d="M440,130 L510,120 L540,135 L550,180 L545,240 L525,300 L500,340 L470,350 L445,330 L425,280 L420,220 L425,170 L430,140 Z" />
            <path d="M520,55 L700,50 L750,65 L770,90 L760,130 L730,155 L690,165 L640,160 L590,150 L555,140 L530,120 L515,95 L515,70 Z" />
            <path d="M615,155 L650,150 L665,175 L655,210 L635,225 L615,210 L605,185 Z" />
            <path d="M700,155 L740,145 L760,165 L755,195 L730,200 L705,185 Z" />
            <path d="M730,280 L820,270 L855,290 L860,340 L840,375 L800,385 L760,375 L730,345 L720,310 Z" />
            <path d="M780,90 L800,85 L810,100 L800,115 L782,110 Z" />

            {/* Pulsing Dots as Squares */}
            {locations.map((loc, idx) => (
              <g key={idx} transform={`translate(${loc.x},${loc.y})`} className="group cursor-help">
                <rect 
                  x={loc.hq ? -12 : -8} 
                  y={loc.hq ? -12 : -8} 
                  width={loc.hq ? 24 : 16} 
                  height={loc.hq ? 24 : 16} 
                  className={`animate-ping ${loc.hq ? 'text-[var(--gold)]/40' : 'text-[var(--sky)]/40'} fill-current`} 
                />
                <rect 
                  x={loc.hq ? -5 : -3.5} 
                  y={loc.hq ? -5 : -3.5} 
                  width={loc.hq ? 10 : 7} 
                  height={loc.hq ? 10 : 7} 
                  className={`${loc.hq ? 'text-[var(--gold)]' : 'text-[var(--sky)]'} fill-current`} 
                />
                <text 
                  x="10" 
                  y="4" 
                  className={`text-[11.5px] font-black uppercase tracking-tighter fill-[var(--navy)]/60 dark:fill-white/60 group-hover:fill-[var(--navy)] dark:group-hover:fill-white transition-colors`}
                >
                  {loc.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Plain-text list -- the map's dot labels get genuinely crowded in
            the Middle East/South-Southeast Asia cluster (11 of the 21
            countries sit close together there), so this list is the
            reliably readable enumeration of all 21, independent of how
            legible any single map label is at a given screen size. */}
        <div className="max-w-3xl mx-auto mb-16 flex flex-wrap justify-center gap-2">
          {locations.map((loc) => (
            <span
              key={loc.name}
              className="px-3 py-1.5 rounded-none bg-white dark:bg-white/5 border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider"
            >
              {loc.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-4">Look around.</p>
          <p className="text-lg text-[var(--text-muted)] mb-8">There&apos;s a DivergenCIE scholar (and a mentor) near you.</p>
          <Link
            href="/contact"
            className="flex items-center gap-3 bg-[var(--gold)] px-8 py-4 rounded-none text-lg font-bold text-white shadow-xl shadow-[var(--gold)]/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Globe size={18} />
            Find Your Coach
          </Link>
        </div>
      </div>
    </section>
  );
}

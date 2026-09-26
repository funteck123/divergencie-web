import { Globe } from "lucide-react";
import Link from "next/link";
import { DOT_SIZE, HIGHLIGHT_DOTS, LAND_DOTS, LEADERS, MAP_VIEWBOX, MARKERS, REGION_BOXES } from "./globalReachMapData";

// TKT-0221: the 21 real countries DivergenCIE has students in (user-
// confirmed 2026-09-01, cross-checked against live account data -- see
// planning/content-sweep-intermediate-plan.md's "Countries with real
// students" section for the full provenance). UK doubles as the HQ marker
// since it's both a real client country and where DivergenCIE is based --
// not a duplicate, one dot covers both facts.
//
// TKT-0271: the map is now a halftone dot map on the Equal Earth projection
// with real country shapes, each country at its true coordinates, and the
// countries grouped into regional callout boxes so the crowded Middle East /
// South Asia / South-East Asia cluster stays readable. The geometry lives in
// globalReachMapData.ts (generated, see the header there); the three designs
// that were considered are kept in planning/mockups/tkt-0271-world-map/.
// Below the sm breakpoint the callout boxes are hidden (their text would be
// too small to read on a phone) and the plain-text list under the map is the
// readable enumeration of all 21.

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

        <div className="relative w-full max-w-screen-2xl mx-auto mb-4">
          <svg
            viewBox={MAP_VIEWBOX}
            className="w-full h-auto"
            role="img"
            aria-label="World map showing the 21 countries where DivergenCIE has students"
          >
            <path d={LAND_DOTS} className="fill-[#cfd6de] dark:fill-white/15" />
            <path d={HIGHLIGHT_DOTS} className="fill-[var(--sky)]" />

            <g className="max-sm:hidden">
              {LEADERS.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={0.9} className="stroke-[var(--navy)]/55 dark:stroke-white/40" />
              ))}
            </g>

            {MARKERS.map((m) => {
              const size = m.hq ? 10 : 6.5;
              return (
                <rect
                  key={m.name}
                  x={m.x - size / 2}
                  y={m.y - size / 2}
                  width={size}
                  height={size}
                  strokeWidth={1}
                  className={m.hq ? "fill-[var(--gold)] stroke-white dark:stroke-black" : "fill-[var(--navy)] stroke-white dark:fill-white dark:stroke-black"}
                >
                  <title>{m.hq ? `${m.name} (HQ)` : m.name}</title>
                </rect>
              );
            })}

            <g className="max-sm:hidden">
              {REGION_BOXES.map((b) => (
                <g key={b.title}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} strokeWidth={0.8} className="fill-white dark:fill-[#161616] stroke-[var(--navy)] dark:stroke-white/40" />
                  <rect x={b.x} y={b.y} width={3} height={b.h} className="fill-[var(--gold)]" />
                  <text x={b.x + 10} y={b.y + 14} fontSize={9.5} fontWeight={900} letterSpacing=".18em" className="fill-[var(--gold)]">
                    {b.title}
                  </text>
                  {b.lines.map((line, i) => (
                    <text key={line} x={b.x + 10} y={b.y + 28 + i * 13.5} fontSize={11} fontWeight={800} className="fill-[var(--navy)] dark:fill-white">
                      {line}
                    </text>
                  ))}
                </g>
              ))}
            </g>
          </svg>
        </div>

        <p className="max-w-2xl mx-auto mb-10 text-xs leading-relaxed text-[var(--text-muted)]">
          Drawn on the Equal Earth projection, which the UN General Assembly backed on 4 September 2026. Every country is shown at its true relative size.{" "}
          <a
            href="https://press.un.org/en/2026/ga12779.doc.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[var(--navy)] dark:hover:text-white"
          >
            UN press release
          </a>
        </p>

        {/* Plain-text list -- the map's region boxes are hidden on phones, and
            small country names are hard to read on any map, so this list is
            the reliably readable enumeration of all 21. */}
        <div className="max-w-3xl mx-auto mb-16 flex flex-wrap justify-center gap-2">
          {MARKERS.map((m) => (
            <span
              key={m.name}
              className="px-3 py-1.5 rounded-none bg-white dark:bg-white/5 border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider"
            >
              {m.name}
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

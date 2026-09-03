"use client";

const results = [
  { uni: "OXFORD" },
  { uni: "CAMBRIDGE" },
  { uni: "LSE" },
  { uni: "IMPERIAL" },
  { uni: "UCL" },
  { uni: "DURHAM" },
  { uni: "WARWICK" },
  { uni: "EDINBURGH" },
  { uni: "KING'S COLLEGE" },
  { uni: "ST ANDREWS" },
];

export default function ResultsTicker() {
  return (
    <div className="w-full bg-white dark:bg-black border-b border-[var(--border-subtle)] flex items-stretch h-14 overflow-hidden relative">
      {/* Fixed Part (Left) */}
      <div className="flex-shrink-0 bg-[var(--gold)] text-[var(--navy)] dark:text-white px-6 flex flex-col justify-center items-center z-20 shadow-[10px_0_15px_rgba(0,0,0,0.1)]">
        <span className="text-[10px] font-black tracking-tighter leading-none">2026–27</span>
        <span className="text-sm font-black tracking-widest uppercase leading-none mt-1">TARGET</span>
      </div>

      {/* Ticker Track */}
      <div className="flex-grow flex items-center bg-white dark:bg-black">
        <div className="flex gap-16 animate-infinite-scroll whitespace-nowrap px-8 items-center">
          {[...results, ...results, ...results].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 group">
              <span className="text-xs font-black text-[var(--text-muted)] tracking-widest uppercase group-hover:text-[var(--navy)] dark:group-hover:text-white transition-colors">
                {item.uni}
              </span>
              <span className="text-[var(--gold)] font-black ml-4 opacity-30">+</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 60s linear infinite;
        }
      `}</style>
    </div>
  );
}

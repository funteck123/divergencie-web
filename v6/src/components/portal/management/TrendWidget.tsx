"use client";

interface TrendWidgetProps {
  labels: string[];
  sessions: number[];
  tickets: number[];
  leads: number[];
}

const SERIES = [
  { key: "sessions" as const, label: "Sessions", color: "#c8a84b" },
  { key: "tickets" as const, label: "Tickets", color: "#0a1628" },
  { key: "leads" as const, label: "Leads", color: "#3b82f6" },
];

function MiniChart({ data, color, labels }: { data: number[]; color: string; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px] h-28 pb-0.5 border-b border-[var(--border-subtle)]">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex items-end group relative" title={`${labels[i]}: ${v}`}>
            <div className="w-full rounded-t hover:opacity-70 transition-opacity" style={{ height: `${Math.max(3, (v / max) * 108)}px`, background: color }} />
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[6px] font-black opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none text-[var(--navy)] dark:text-white">
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[6px] font-bold text-[var(--text-muted)] uppercase truncate">{l}</div>
        ))}
      </div>
    </div>
  );
}

export default function TrendWidget({ labels, sessions, tickets, leads }: TrendWidgetProps) {
  const data = { sessions, tickets, leads };
  return (
    <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">8-Week Platform Trend</h3>
        <div className="flex gap-4">
          {SERIES.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {SERIES.map(s => (
          <div key={s.key}>
            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">{s.label}</p>
            <MiniChart data={data[s.key]} color={s.color} labels={labels} />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useId, useMemo, useState } from "react";
import "./solver.css";

export interface Point { x: number; y: number; label: string }
export interface Series { id: string; label: string; points: Point[]; emphasis?: boolean }

const W = 700;
const H = 280;
const pad = { l: 40, r: 14, t: 14, b: 38 };
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Score % per attempt against date (dates on the axis, 0 to 100 %). The student's own line is bold with points you can focus
 * and hover for the paper and score; other students are faint lines that can be switched off. One scale places every mark.
 */
export function LineChart({ series, emptyText, kind = "score" }: { series: readonly Series[]; emptyText: string; /** score: percent against date. count: a running total against completion order (the syllabus tracker). */ kind?: "score" | "count" }) {
  const id = useId();
  const [showOthers, setShowOthers] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const mine = series.find((s) => s.emphasis);
  const others = series.filter((s) => !s.emphasis);

  const { xAt, yAt, ticks, yMax } = useMemo(() => {
    const xs = series.flatMap((s) => s.points.map((p) => p.x));
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const span = max - min || 1;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const count = Math.min(5, Math.max(1, new Set(xs).size));
    const yMax = kind === "count" ? Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))) : 100;
    return {
      yMax,
      xAt: (x: number) => pad.l + (max === min ? plotW / 2 : ((x - min) / span) * plotW),
      yAt: (v: number) => pad.t + plotH - (v / yMax) * plotH,
      ticks: Array.from({ length: count }, (_, i) => (count === 1 ? min : min + (span * i) / (count - 1))),
    };
  }, [series, kind]);
  const fmtX = (t: number) => (kind === "count" ? String(Math.round(t)) : fmtDay(t));
  const yTicks = [...new Set([0, Math.round(yMax / 2), yMax])];

  if (!mine || mine.points.length === 0) return <p className="u2-muted">{emptyText}</p>;
  const path = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.x).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(" ");

  return (
    <figure className="u2-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setTip(null)}>
        <title id={`${id}-t`}>{kind === "count" ? "Topics completed over time" : "Score per attempt over time"}</title>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={yAt(v)} y2={yAt(v)} className="u2-chart__grid" />
            <text x={pad.l - 6} y={yAt(v) + 4} textAnchor="end" className="u2-chart__tick">{v}{kind === "count" ? "" : "%"}</text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={xAt(t)} y={H - pad.b + 18} textAnchor="middle" className="u2-chart__tick">{fmtX(t)}</text>
        ))}
        {showOthers && others.map((s) => <path key={s.id} d={path(s.points)} className="u2-chart__other"><title>{s.label}</title></path>)}
        <path d={path(mine.points)} className="u2-chart__mine" />
        {mine.points.map((p, i) => (
          <circle
            key={i} cx={xAt(p.x)} cy={yAt(p.y)} r={5} className="u2-chart__dot" tabIndex={0} role="img" aria-label={p.label}
            onMouseEnter={() => setTip({ x: xAt(p.x), y: yAt(p.y), text: p.label })} onFocus={() => setTip({ x: xAt(p.x), y: yAt(p.y), text: p.label })} onBlur={() => setTip(null)}
          />
        ))}
        {tip && (
          <g pointerEvents="none">
            <rect x={Math.min(W - 230, Math.max(4, tip.x - 110))} y={Math.max(4, tip.y - 38)} width={220} height={26} rx={4} className="u2-chart__tipbg" />
            <text x={Math.min(W - 230, Math.max(4, tip.x - 110)) + 110} y={Math.max(4, tip.y - 38) + 17} textAnchor="middle" className="u2-chart__tiptext">{tip.text}</text>
          </g>
        )}
      </svg>
      <figcaption className="u2-chart__legend">
        <span><i className="u2-chart__key u2-chart__key--mine" /> You</span>
        {others.length > 0 && (
          <label className="u2-check">
            <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} />
            <i className="u2-chart__key u2-chart__key--other" /> Other students ({others.length})
          </label>
        )}
      </figcaption>
    </figure>
  );
}

/** One bar per chapter: total mistakes ever made there. Labels are the full chapter names; long ones wrap under the bar. */
export function BarChart({ data, label }: { data: { key: string; label: string; value: number }[]; label: string }) {
  const id = useId();
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = Math.max(18, Math.min(60, (W - pad.l - pad.r) / data.length - 8));
  const step = (W - pad.l - pad.r) / data.length;
  return (
    <figure className="u2-chart">
      <svg viewBox={`0 0 ${W} ${H + 30}`} role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{label}</title>
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} className="u2-chart__grid" />
        <text x={pad.l - 6} y={pad.t + 8} textAnchor="end" className="u2-chart__tick">{max}</text>
        <text x={pad.l - 6} y={H - pad.b} textAnchor="end" className="u2-chart__tick">0</text>
        {data.map((d, i) => {
          const h = (d.value / max) * (H - pad.t - pad.b);
          const x = pad.l + i * step + (step - barW) / 2;
          return (
            <g key={d.key}>
              <rect x={x} y={H - pad.b - h} width={barW} height={h} className="u2-chart__bar"><title>{`${d.label}: ${d.value}`}</title></rect>
              <text x={x + barW / 2} y={H - pad.b - h - 4} textAnchor="middle" className="u2-chart__tick">{d.value}</text>
              <text x={x + barW / 2} y={H - pad.b + 14} textAnchor="end" transform={`rotate(-40 ${x + barW / 2} ${H - pad.b + 14})`} className="u2-chart__tick">{d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

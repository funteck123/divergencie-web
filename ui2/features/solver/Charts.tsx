"use client";

import { useEffect, useId, useMemo, useState } from "react";
import "./solver.css";

export interface Point { x: number; y: number; label: string }
export interface Series { id: string; label: string; points: Point[]; emphasis?: boolean }

const W = 700;
const H = 280;
const pad = { l: 40, r: 14, t: 14, b: 38 };
/** A smooth curve through the points that never overshoots them (monotone cubic), so a curve can't dip below 0 % or rise over 100 %. */
function smoothPath(raw: readonly (readonly [number, number])[]): string {
  const pts = [...raw].sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  if (n === 0) return "";
  const at = (i: number) => pts[i] as readonly [number, number];
  if (n === 1) return `M${f(at(0)[0])},${f(at(0)[1])}`;
  const dx: number[] = [], sl: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(at(i + 1)[0] - at(i)[0]); sl.push(dx[i] ? (at(i + 1)[1] - at(i)[1]) / (dx[i] as number) : 0); }
  const m: number[] = [sl[0] as number];
  for (let i = 1; i < n - 1; i++) m.push((sl[i - 1] as number) * (sl[i] as number) <= 0 ? 0 : ((sl[i - 1] as number) + (sl[i] as number)) / 2);
  m.push(sl[n - 2] as number);
  for (let i = 0; i < n - 1; i++) {
    const d = sl[i] as number;
    if (d === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = (m[i] as number) / d, b = (m[i + 1] as number) / d, h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d; m[i + 1] = t * b * d; }
  }
  let d = `M${f(at(0)[0])},${f(at(0)[1])}`;
  for (let i = 0; i < n - 1; i++) {
    const w = (dx[i] as number) / 3;
    d += ` C${f(at(i)[0] + w)},${f(at(i)[1] + (m[i] as number) * w)} ${f(at(i + 1)[0] - w)},${f(at(i + 1)[1] - (m[i + 1] as number) * w)} ${f(at(i + 1)[0])},${f(at(i + 1)[1])}`;
  }
  return d;
}
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Score % per attempt against date (dates on the axis, 0 to 100 %). The student's own line is bold with points you can focus
 * and hover for the paper and score; other students are faint lines that can be switched off. One scale places every mark.
 */
export function LineChart({ series, emptyText, kind = "score", passMark }: { series: readonly Series[]; emptyText: string; /** score charts: a dashed line at this percent, labelled as the level that counts as solved. */ passMark?: number; /** score: percent against date. count: a running total against completion order (the syllabus tracker). */ kind?: "score" | "count" }) {
  const id = useId();
  const [box, setBox] = useState<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(W);
  // Draw at the real width: on a phone the drawing is not shrunk, so its text stays readable.
  useEffect(() => {
    const el = box;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(Math.max(300, Math.round(el.getBoundingClientRect().width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  const w = width;
  const h = w < 520 ? 240 : H;
  const [showOthers, setShowOthers] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const mine = series.find((s) => s.emphasis);
  const others = series.filter((s) => !s.emphasis);

  const { xAt, yAt, ticks, yMax } = useMemo(() => {
    const xs = series.flatMap((s) => s.points.map((p) => p.x));
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const span = max - min || 1;
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const count = Math.min(5, Math.max(1, new Set(xs).size));
    const yMax = kind === "count" ? Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))) : 100;
    return {
      yMax,
      xAt: (x: number) => pad.l + (max === min ? plotW / 2 : ((x - min) / span) * plotW),
      yAt: (v: number) => pad.t + plotH - (v / yMax) * plotH,
      ticks: Array.from({ length: count }, (_, i) => (count === 1 ? min : min + (span * i) / (count - 1))),
    };
  }, [series, kind, w, h]);
  const fmtX = (t: number) => (kind === "count" ? String(Math.round(t)) : fmtDay(t));
  const yTicks = [...new Set([0, Math.round(yMax / 2), yMax])];

  if (!mine || mine.points.length === 0) return <p className="u2-muted">{emptyText}</p>;
  const path = (pts: Point[]) => smoothPath(pts.map((p) => [xAt(p.x), yAt(p.y)] as const));
  const sorted = [...mine.points].sort((a, b) => a.x - b.x);
  const first = sorted[0] as Point;
  const last = sorted[sorted.length - 1] as Point;
  const best = sorted.reduce((b, p) => (p.y > b.y ? p : b), first);
  const base = yAt(0);
  const area = sorted.length > 1 ? `${path(sorted)} L${xAt(last.x).toFixed(1)},${base.toFixed(1)} L${xAt(first.x).toFixed(1)},${base.toFixed(1)} Z` : "";

  return (
    <figure className="u2-chart">
      <svg ref={setBox} viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setTip(null)}>
        <title id={`${id}-t`}>{kind === "count" ? "Topics completed over time" : "Score per attempt over time"}</title>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={yAt(v)} y2={yAt(v)} className="u2-chart__grid" />
            <text x={pad.l - 6} y={yAt(v) + 4} textAnchor="end" className="u2-chart__tick">{v}{kind === "count" ? "" : "%"}</text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={xAt(t)} y={h - pad.b + 18} textAnchor={xAt(t) > w - 40 ? "end" : "middle"} className="u2-chart__tick">{fmtX(t)}</text>
        ))}
        {showOthers && others.map((s) => <path key={s.id} d={path(s.points)} className="u2-chart__other"><title>{s.label}</title></path>)}
        {kind === "score" && passMark != null && (
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={yAt(passMark)} y2={yAt(passMark)} className="u2-chart__pass" />
            <text x={w - pad.r - 2} y={yAt(passMark) - 4} textAnchor="end" className="u2-chart__tick">{passMark}% counts as solved</text>
          </g>
        )}
        {area && <path d={area} className="u2-chart__area" />}
        <path d={path(mine.points)} className="u2-chart__mine" />
        {mine.points.map((p, i) => (
          <circle
            key={i} cx={xAt(p.x)} cy={yAt(p.y)} r={p === best ? 7 : 4.5} className={p === best ? "u2-chart__dot u2-chart__dot--best" : "u2-chart__dot"} tabIndex={0} role="img" aria-label={p.label}
            onMouseEnter={() => setTip({ x: xAt(p.x), y: yAt(p.y), text: p.label })} onFocus={() => setTip({ x: xAt(p.x), y: yAt(p.y), text: p.label })} onBlur={() => setTip(null)}
          />
        ))}
        {kind === "score" && (
          <text x={xAt(last.x)} y={yAt(last.y) + 20} textAnchor={xAt(last.x) > w - 40 ? "end" : "middle"} className="u2-chart__latest">{Math.round(last.y)}%</text>
        )}
        {tip && (
          <g pointerEvents="none">
            <rect x={Math.min(w - 230, Math.max(4, tip.x - 110))} y={Math.max(4, tip.y - 38)} width={220} height={26} rx={4} className="u2-chart__tipbg" />
            <text x={Math.min(w - 230, Math.max(4, tip.x - 110)) + 110} y={Math.max(4, tip.y - 38) + 17} textAnchor="middle" className="u2-chart__tiptext">{tip.text}</text>
          </g>
        )}
      </svg>
      <figcaption className="u2-chart__legend">
        <span><i className="u2-chart__key u2-chart__key--mine" /> You</span>
        {kind === "score" && mine.points.length > 1 && <span><i className="u2-chart__key u2-chart__key--best" /> Your best</span>}
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

/**
 * TKT-0454: where attempts sit along the time axis. Pure time put attempts made minutes apart on top of each other, so on an axis of months
 * the line between them was a vertical stroke. Every distinct moment now gets room of its own: half of its place follows the real time, half
 * follows its order. Order is kept and the shape still reads as time, but neighbours are never closer than half of an even spacing.
 * Returns the position from 0 to 1 for a moment that is in `xs`.
 */
export function spreadScale(xs: readonly number[]): (x: number) => number {
  const u = [...new Set(xs)].sort((a, b) => a - b);
  if (u.length <= 1) return () => 0.5;
  const min = u[0] as number, span = (u[u.length - 1] as number) - min || 1;
  const rank = new Map(u.map((x, i) => [x, i]));
  return (x) => 0.5 * ((x - min) / span) + 0.5 * ((rank.get(x) ?? 0) / (u.length - 1));
}

/** Evenly spaced picks (up to `count`) from the distinct moments, first and last included, so axis labels sit where attempts are. */
export function pickTicks(xs: readonly number[], count: number): number[] {
  const u = [...new Set(xs)].sort((a, b) => a - b);
  if (u.length <= count) return u;
  return Array.from({ length: count }, (_, i) => u[Math.round((i * (u.length - 1)) / (count - 1))] as number);
}

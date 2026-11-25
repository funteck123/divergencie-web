// TKT-0441: which Gemini endpoint grades next.
// Before: a plain round-robin over every (key, model) pair, so the same answer was marked by a different model on every attempt (1/7 once, 0/7 once).
// Now: models keep the order of GEMINI_MODEL_POOL (first model = preferred). Only the keys of ONE model rotate, which spreads the load and keeps the marks steady. A later model grades only when the earlier ones are on a quota cooldown or have failed.
export function orderEndpoints({ endpoints, modelPool, cooldownUntil, now, cursor }) {
  const available = endpoints.filter((e) => (cooldownUntil.get(e.id) || 0) <= now);
  const pool = available.length > 0 ? available : endpoints;
  const out = [];
  for (const model of modelPool) {
    const same = pool.filter((e) => e.model === model);
    if (same.length === 0) continue;
    const s = cursor % same.length;
    out.push(...same.slice(s), ...same.slice(0, s));
  }
  for (const e of pool) if (!out.includes(e)) out.push(e); // an endpoint whose model is not in the pool list goes last
  return out;
}

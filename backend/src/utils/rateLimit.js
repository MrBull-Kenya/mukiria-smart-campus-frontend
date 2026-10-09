// Tiny in-memory sliding-window limiter (per server process). Enough to stop someone using the
// "forgot password" form to flood a person's inbox; behind a load balancer use a shared store instead.
const hits = new Map();
export const RATE_WINDOW_MS = 15 * 60 * 1000;

export function allow(key, limit, windowMs = RATE_WINDOW_MS) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

setInterval(() => { const now = Date.now(); for (const [k, v] of hits) { const r = v.filter((t) => now - t < RATE_WINDOW_MS); r.length ? hits.set(k, r) : hits.delete(k); } }, 10 * 60 * 1000).unref();

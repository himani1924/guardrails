/**
 * Very small in-memory rate limiter used by mutating API routes. Not a
 * production solution — a single process, no persistence — but good enough
 * to reject accidental floods during a demo and testable.
 */
const WINDOW_MS = 60_000;
const MAX_HITS_PER_KEY = 60;

const buckets = new Map<string, { hits: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number;
}

export function rateLimit(key: string, opts?: { max?: number; windowMs?: number }): RateLimitResult {
  const now = Date.now();
  const max = opts?.max ?? MAX_HITS_PER_KEY;
  const window = opts?.windowMs ?? WINDOW_MS;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { hits: 1, resetAt: now + window });
    return { ok: true, remaining: max - 1, resetIn: window };
  }
  bucket.hits += 1;
  return {
    ok: bucket.hits <= max,
    remaining: Math.max(0, max - bucket.hits),
    resetIn: bucket.resetAt - now,
  };
}

/**
 * Memory-safe sliding-window rate limiter for sensitive Server Actions.
 * Tracks failed attempts within a configurable time window.
 */

interface RateLimitRecord {
  attempts: number[];
}

const store = new Map<string, RateLimitRecord>();

// Periodic garbage collection to prevent memory leaks (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, record] of store.entries()) {
    record.attempts = record.attempts.filter((ts) => now - ts < windowMs);
    if (record.attempts.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check if the given key is within the rate limit.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 10 * 60 * 1000, // 10 minutes
): RateLimitResult {
  cleanupExpiredRecords(windowMs);

  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  // Filter out attempts outside the sliding window
  record.attempts = record.attempts.filter((ts) => now - ts < windowMs);

  if (record.attempts.length >= maxAttempts) {
    const oldest = record.attempts[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - record.attempts.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Record a failed attempt for the given key.
 */
export function recordFailedAttempt(key: string, windowMs = 10 * 60 * 1000): void {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    store.set(key, { attempts: [now] });
  } else {
    record.attempts = record.attempts.filter((ts) => now - ts < windowMs);
    record.attempts.push(now);
  }
}

/**
 * Reset failed attempts on a successful verification.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

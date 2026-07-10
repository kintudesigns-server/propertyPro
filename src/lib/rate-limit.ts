import { NextRequest } from "next/server";

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const tracker = new Map<string, RateLimitTracker>();

// Cleanup interval to avoid memory leaks
if (typeof global !== "undefined") {
  const intervalId = "rateLimitCleanupInterval";
  if (!(global as any)[intervalId]) {
    (global as any)[intervalId] = setInterval(() => {
      const now = Date.now();
      for (const [key, val] of tracker.entries()) {
        if (now > val.resetTime) {
          tracker.delete(key);
        }
      }
    }, 60000); // every 1 minute
  }
}

/**
 * Basic in-memory rate limiter based on request IP and path.
 * Returns information about remaining capacity and whether the limit was exceeded.
 */
export function rateLimit(req: NextRequest, limit: number = 10, windowMs: number = 60000): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const path = req.nextUrl.pathname;
  const key = `${ip}:${path}`;
  const now = Date.now();

  let entry = tracker.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  entry.count++;
  tracker.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const success = entry.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: entry.resetTime,
  };
}

import type { NextFunction, Request, RequestHandler, Response } from "express";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Duration of the rate-limit window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed per window */
  max: number;
  /** Error message returned to the client when the limit is exceeded */
  message?: string;
}

/**
 * Creates a simple in-memory fixed-window rate limiter middleware.
 *
 * Each rate limiter instance maintains its own store keyed by client IP.
 * This is intentionally simple (not distributed) — sufficient for single-node deployments.
 *
 * Rate-limited endpoints and their thresholds:
 *   POST /auth/login                        — 10 req / 15 min  (brute-force protection)
 *   POST /auth/register                     — 5 req  / 60 min  (account-creation spam)
 *   POST /devices/register                  — 10 req / 60 min  (device spam)
 *   POST /devices/heartbeat                 — 120 req / 1 min  (frequent but bounded)
 *   POST /devices/:id/command               — 60 req / 1 min   (remote-control abuse)
 *   POST /plugins/:id/install               — 20 req / 5 min   (install/uninstall spam)
 *   DELETE /plugins/:id/install             — 20 req / 5 min   (install/uninstall spam)
 *   POST /developer/plugins                 — 5 req  / 60 min  (plugin creation spam)
 *   POST /developer/plugins/:id/versions    — 10 req / 60 min  (version publish spam)
 */
export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, message = "Too many requests, please try again later" } = options;
  const store = new Map<string, RateLimitWindow>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
        },
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Logger } from "../../core/logger/logger.js";
import { sendError } from "../response.js";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimiter extends RequestHandler {
  reset(): void;
}

function clientKey(request: Request): string {
  return `${request.ip ?? "unknown"}:${request.method}:${request.baseUrl}${request.path}`;
}

export function createRateLimiter(
  logger: Logger,
  options: RateLimitOptions,
): RateLimiter {
  const windows = new Map<string, Window>();
  let nextSweepAt = 0;

  function sweep(now: number): void {
    if (now < nextSweepAt) {
      return;
    }

    for (const [key, window] of windows) {
      if (window.resetAt <= now) {
        windows.delete(key);
      }
    }

    nextSweepAt = now + options.windowMs;
  }

  const middleware = Object.assign(
    (request: Request, response: Response, next: NextFunction): unknown => {
      if (options.max === 0) {
        return next();
      }

      const now = Date.now();
      sweep(now);

      const key = clientKey(request);
      const current = windows.get(key);
      const window =
        current && current.resetAt > now
          ? current
          : { count: 0, resetAt: now + options.windowMs };

      window.count += 1;
      windows.set(key, window);

      response.setHeader("X-RateLimit-Limit", String(options.max));
      response.setHeader(
        "X-RateLimit-Remaining",
        String(Math.max(0, options.max - window.count)),
      );

      if (window.count > options.max) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((window.resetAt - now) / 1000),
        );

        response.setHeader("Retry-After", String(retryAfterSeconds));
        logger.warn("auth rate limit exceeded", {
          ip: request.ip,
          path: request.path,
          retryAfterSeconds,
        });

        return sendError(
          response,
          429,
          "RATE_LIMITED",
          "Too many requests. Please try again later.",
        );
      }

      return next();
    },
    {
      reset() {
        windows.clear();
        nextSweepAt = 0;
      },
    },
  );

  return middleware;
}

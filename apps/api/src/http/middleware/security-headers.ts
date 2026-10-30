import type { RequestHandler } from "express";

export interface SecurityHeadersOptions {
  hsts: boolean;
}

const STATIC_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function createSecurityHeaders(
  options: SecurityHeadersOptions,
): RequestHandler {
  return (_request, response, next) => {
    for (const [name, value] of Object.entries(STATIC_HEADERS)) {
      response.setHeader(name, value);
    }

    if (options.hsts) {
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains",
      );
    }

    next();
  };
}

import { env } from "../../config/env.js";

export const SESSION_COOKIE_NAME = "teamflow_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function sessionCookieSecurityOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function buildSessionCookieOptions() {
  return {
    ...sessionCookieSecurityOptions(),
    maxAge: SESSION_TTL_MS,
  };
}

export function buildClearedSessionCookieOptions() {
  return sessionCookieSecurityOptions();
}

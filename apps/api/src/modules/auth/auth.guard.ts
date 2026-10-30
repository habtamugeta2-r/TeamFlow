import type { Request, RequestHandler, Response } from "express";
import { HttpException } from "../../http/exception.js";
import { sendError } from "../../http/response.js";
import {
  buildClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "./auth.constants.js";
import type { AuthService, PublicUser } from "./auth.service.js";

/* ───────── Express request augmentation ───────── */

export type AuthenticatedUser = PublicUser;

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

export function requireAuthenticatedUser(request: Request): AuthenticatedUser {
  if (!request.authUser) {
    throw new HttpException(401, "UNAUTHENTICATED", "Authentication required.");
  }
  return request.authUser;
}

/* ───────── Guard implementation ───────── */

function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, buildClearedSessionCookieOptions());
}

/**
 * Creates an Express middleware that validates the session cookie
 * and attaches `req.authUser` on success.
 */
export function createAuthGuard(
  authService: Pick<AuthService, "findUserBySessionToken">,
): RequestHandler {
  return async (request, response, next) => {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    if (typeof sessionToken !== "string" || sessionToken.length === 0) {
      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication required.",
      );
    }

    const user = await authService.findUserBySessionToken(sessionToken);

    if (!user) {
      clearSessionCookie(response);

      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication required.",
      );
    }

    request.authUser = user;
    return next();
  };
}

export const createRequireAuth = createAuthGuard;

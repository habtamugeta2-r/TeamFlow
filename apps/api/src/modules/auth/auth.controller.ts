import type { RequestHandler } from "express";
import { sendSuccess } from "../../http/response.js";
import { parseRequest } from "../../http/validation.js";
import { runWithErrorMap } from "../../http/service-error.js";
import { requireAuthenticatedUser } from "./auth.guard.js";
import { authErrors } from "./auth.errors.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  buildSessionCookieOptions,
  buildClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "./auth.constants.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {
  }

  /** POST /register */
  register: RequestHandler = async (request, response) => {
    const input = parseRequest(
      registerSchema,
      request.body,
      "The request is invalid.",
    );
    const user = await runWithErrorMap(authErrors, () =>
      this.authService.registerUser(input),
    );
    sendSuccess(response, 201, { user });
  };

  /** POST /login */
  login: RequestHandler = async (request, response) => {
    const input = parseRequest(
      loginSchema,
      request.body,
      "The request is invalid.",
    );
    const { user, sessionToken } = await runWithErrorMap(authErrors, () =>
      this.authService.authenticateUser(input),
    );

    response.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      buildSessionCookieOptions(),
    );

    sendSuccess(response, 200, { user });
  };

  /** GET /me */
  currentUser: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    sendSuccess(response, 200, { user });
  };

  /** POST /logout */
  logout: RequestHandler = async (request, response) => {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    if (typeof sessionToken === "string" && sessionToken.length > 0) {
      await this.authService.revokeSession(sessionToken);
    }

    response.clearCookie(
      SESSION_COOKIE_NAME,
      buildClearedSessionCookieOptions(),
    );

    sendSuccess(response, 200, { success: true });
  };
}

export function createAuthController(authService: AuthService): AuthController {
  return new AuthController(authService);
}

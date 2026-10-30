import type { RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { AuthController, createAuthController } from "./auth.controller.js";
import { AuthService, createAuthService } from "./auth.service.js";
import { createAuthGuard, createRequireAuth } from "./auth.guard.js";
import { createAuthRouter } from "./auth.routes.js";

export interface AuthModuleDependencies {
  database?: PrismaClient;
  service?: AuthService;
  credentialRateLimiter?: RequestHandler;
}

export function createAuthModule(deps: AuthModuleDependencies) {
  const service =
    deps.service ??
    (deps.database ? new AuthService(deps.database) : undefined);
  if (!service) {
    throw new Error("Auth module requires a database or auth service.");
  }

  const controller = new AuthController(service);
  const guard = createAuthGuard(service);
  return {
    router: createAuthRouter(
      controller,
      guard,
      deps.credentialRateLimiter,
    ),
    guard,
  };
}

export { createRequireAuth, createAuthController, createAuthService, createAuthRouter };

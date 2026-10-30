import { Router, type RequestHandler } from "express";
import type { AuthController } from "./auth.controller.js";

/**
 * Creates the Express router for authentication routes.
 */
export function createAuthRouter(
  controller: AuthController,
  requireAuth: RequestHandler,
  credentialRateLimiter?: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/register",
    ...(credentialRateLimiter ? [credentialRateLimiter] : []),
    controller.register,
  );
  router.post(
    "/login",
    ...(credentialRateLimiter ? [credentialRateLimiter] : []),
    controller.login,
  );
  router.get("/me", requireAuth, controller.currentUser);
  router.post("/logout", controller.logout);

  return router;
}

import { Router, type RequestHandler } from "express";
import type { ActivityController } from "./activity.controller.js";

export function createActivityRouter(
  controller: ActivityController,
  requireAuth: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.get("/", requireAuth, controller.list);
  return router;
}

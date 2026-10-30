import { Router, type RequestHandler } from "express";
import type { TaskController } from "./task.controller.js";

export function createTaskRouter(
  controller: TaskController,
  requireAuth: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.get("/:taskId", requireAuth, controller.get);
  router.patch("/:taskId", requireAuth, controller.update);

  return router;
}

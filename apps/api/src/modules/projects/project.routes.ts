import { Router, type RequestHandler } from "express";
import type { ProjectController } from "./project.controller.js";

export function createProjectRouter(
  controller: ProjectController,
  requireAuth: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.get("/:projectId", requireAuth, controller.get);
  router.patch("/:projectId", requireAuth, controller.update);
  router.post("/:projectId/archive", requireAuth, controller.archive);

  return router;
}

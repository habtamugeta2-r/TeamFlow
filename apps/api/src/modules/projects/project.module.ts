import type { RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { ProjectController } from "./project.controller.js";
import { createProjectRouter } from "./project.routes.js";
import { ProjectService } from "./project.service.js";

export interface ProjectModuleDependencies {
  database?: PrismaClient;
  service?: ProjectService;
  requireAuth: RequestHandler;
}

export function createProjectModule(deps: ProjectModuleDependencies) {
  const service =
    deps.service ??
    (deps.database ? new ProjectService(deps.database) : undefined);
  if (!service) {
    throw new Error("Project module requires a database or service.");
  }

  const controller = new ProjectController(service);
  return {
    router: createProjectRouter(controller, deps.requireAuth),
  };
}

import type { RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createActivityController } from "./activity.controller.js";
import { createActivityRouter } from "./activity.routes.js";
import { ActivityService } from "./activity.service.js";

export interface ActivityModuleDependencies {
  database: PrismaClient;
  requireAuth: RequestHandler;
}

export function createActivityModule(deps: ActivityModuleDependencies) {
  const service = new ActivityService(deps.database);
  const controller = createActivityController(service);

  return {
    router: createActivityRouter(controller, deps.requireAuth),
  };
}

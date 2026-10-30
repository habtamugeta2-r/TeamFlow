import type { RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { TaskController } from "./task.controller.js";
import { createTaskRouter } from "./task.routes.js";
import { TaskService } from "./task.service.js";

export interface TaskModuleDependencies {
  database: PrismaClient;
  requireAuth: RequestHandler;
}

export function createTaskModule(deps: TaskModuleDependencies) {
  const service = new TaskService(deps.database);
  const controller = new TaskController(service);

  return {
    router: createTaskRouter(controller, deps.requireAuth),
  };
}

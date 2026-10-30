import type { RequestHandler } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  WorkspaceController,
  createWorkspaceController,
} from "./workspace.controller.js";
import {
  WorkspaceService,
  createWorkspaceService,
} from "./workspace.service.js";
import { createWorkspaceRouter } from "./workspace.routes.js";

export interface WorkspaceModuleDependencies {
  database?: PrismaClient;
  service?: WorkspaceService;
  requireAuth: RequestHandler;
}

export function createWorkspaceModule(deps: WorkspaceModuleDependencies) {
  const service =
    deps.service ??
    (deps.database ? new WorkspaceService(deps.database) : undefined);
  if (!service) {
    throw new Error("Workspace module requires a database or service.");
  }

  const controller = new WorkspaceController(service);
  return {
    router: createWorkspaceRouter(controller, deps.requireAuth),
  };
}

export {
  createWorkspaceController,
  createWorkspaceService,
  createWorkspaceRouter,
};

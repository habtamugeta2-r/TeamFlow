import type { Logger } from "../../core/logger/logger.js";
import {
  HealthController,
  createHealthController,
} from "./health.controller.js";
import { createHealthRouter } from "./health.routes.js";
import { HealthService, createHealthService } from "./health.service.js";

export interface HealthModuleDependencies {
  checkDatabase: () => Promise<void>;
  logger: Logger;
}

export function createHealthModule(deps: HealthModuleDependencies) {
  const service = new HealthService(deps.checkDatabase, deps.logger);
  const controller = new HealthController(service);
  return { router: createHealthRouter(controller) };
}

export { createHealthController, createHealthService, createHealthRouter };

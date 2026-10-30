import type { RequestHandler } from "express";
import type { Logger } from "../../core/logger/logger.js";
import { HealthService } from "./health.service.js";

export type HealthControllerDependencies =
  | { healthService: HealthService }
  | { checkDatabase: () => Promise<void>; logger: Logger };

export class HealthController {
  private readonly healthService: HealthService;

  constructor(dependencies: HealthControllerDependencies | HealthService) {
    if (dependencies instanceof HealthService) {
      this.healthService = dependencies;
    } else if ("healthService" in dependencies) {
      this.healthService = dependencies.healthService;
    } else {
      this.healthService = new HealthService(
        dependencies.checkDatabase,
        dependencies.logger,
      );
    }
  }

  /** GET / — liveness probe */
  live: RequestHandler = async (_request, response) => {
    response.status(200).json(this.healthService.getLiveness());
  };

  /** GET /ready — readiness probe (checks database) */
  ready: RequestHandler = async (_request, response) => {
    const { isReady, data } = await this.healthService.getReadiness();
    response.status(isReady ? 200 : 503).json(data);
  };
}

export function createHealthController(
  dependencies: HealthControllerDependencies | HealthService,
): HealthController {
  return new HealthController(dependencies);
}

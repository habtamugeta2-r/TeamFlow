import type { Logger } from "../../core/logger/logger.js";

export type HealthStatus = {
  status: "ok" | "error";
  database?: "connected" | "unavailable";
};

export class HealthService {
  constructor(
    private readonly checkDatabase: () => Promise<void>,
    private readonly logger: Logger,
  ) {}

  getLiveness(): HealthStatus {
    return { status: "ok" };
  }

  async getReadiness(): Promise<{ isReady: boolean; data: HealthStatus }> {
    try {
      await this.checkDatabase();
      return {
        isReady: true,
        data: { status: "ok", database: "connected" },
      };
    } catch (error) {
      this.logger.error("Database readiness check failed", { error });
      return {
        isReady: false,
        data: { status: "error", database: "unavailable" },
      };
    }
  }
}

export function createHealthService(
  checkDatabase: () => Promise<void>,
  logger: Logger,
): HealthService {
  return new HealthService(checkDatabase, logger);
}

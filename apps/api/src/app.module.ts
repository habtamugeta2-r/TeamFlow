import { Router } from "express";
import {
  createRateLimiter,
  type RateLimitOptions,
} from "./http/middleware/rate-limiter.js";
import type { Logger } from "./core/logger/logger.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createActivityModule } from "./modules/activity/index.js";
import { createAuthModule } from "./modules/auth/index.js";
import { createHealthModule } from "./modules/health/index.js";
import { createProjectModule } from "./modules/projects/index.js";
import { createTaskModule } from "./modules/tasks/index.js";
import { createWorkspaceModule } from "./modules/workspaces/index.js";

export interface AppModuleDependencies {
  database: PrismaClient;
  checkDatabase: () => Promise<void>;
  logger: Logger;
  authRateLimit: RateLimitOptions;
}

export function createAppModule(deps: AppModuleDependencies): Router {
  const credentialRateLimiter = createRateLimiter(
    deps.logger,
    deps.authRateLimit,
  );
  const auth = createAuthModule({
    database: deps.database,
    credentialRateLimiter,
  });
  const activity = createActivityModule({
    database: deps.database,
    requireAuth: auth.guard,
  });
  const health = createHealthModule({
    checkDatabase: deps.checkDatabase,
    logger: deps.logger,
  });
  const projects = createProjectModule({
    database: deps.database,
    requireAuth: auth.guard,
  });
  const tasks = createTaskModule({
    database: deps.database,
    requireAuth: auth.guard,
  });
  const workspaces = createWorkspaceModule({
    database: deps.database,
    requireAuth: auth.guard,
  });

  const router = Router();
  router.use("/auth", auth.router);
  router.use("/health", health.router);
  router.use("/workspaces/:workspaceId/activity", activity.router);
  router.use(
    "/workspaces/:workspaceId/projects/:projectId/tasks",
    tasks.router,
  );
  router.use("/workspaces/:workspaceId/projects", projects.router);
  router.use("/workspaces", workspaces.router);

  return router;
}

import express from "express";
import cookieParser from "cookie-parser";
import type { Logger } from "./core/logger/logger.js";
import { logger as defaultLogger } from "./core/logger/logger.js";
import type { RateLimitOptions } from "./http/middleware/rate-limiter.js";
import { createRequestContext } from "./http/middleware/request-context.js";
import { createSecurityHeaders } from "./http/middleware/security-headers.js";
import { createExceptionFilter } from "./http/middleware/exception-filter.js";
import { sendError } from "./http/response.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { createAppModule } from "./app.module.js";

export type AppDependencies = {
  database?: PrismaClient;
  checkDatabase?: () => Promise<void>;
  authRateLimit?: RateLimitOptions;
  logger?: Logger;
};

/** Create an API instance with injectable readiness checks. */
export function createApp(dependencies: AppDependencies = {}) {
  const database = dependencies.database ?? prisma;
  const logger = dependencies.logger ?? defaultLogger;
  const checkDatabase =
    dependencies.checkDatabase ??
    (async () => {
      await database.$queryRaw`SELECT 1`;
    });

  const apiRouter = createAppModule({
    database,
    checkDatabase,
    logger,
    authRateLimit: {
      windowMs:
        dependencies.authRateLimit?.windowMs ?? env.AUTH_RATE_LIMIT_WINDOW_MS,
      max: dependencies.authRateLimit?.max ?? env.AUTH_RATE_LIMIT_MAX,
    },
  });

  const app = express();
  app.disable("x-powered-by");

  if (env.TRUST_PROXY !== undefined) {
    app.set("trust proxy", env.TRUST_PROXY);
  }

  app.use(createRequestContext(logger));
  app.use(createSecurityHeaders({ hsts: env.NODE_ENV === "production" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", apiRouter);
  app.use((_request, response) => {
    sendError(response, 404, "NOT_FOUND", "Route not found.");
  });
  app.use(createExceptionFilter(logger));

  return app;
}

export const app = createApp();

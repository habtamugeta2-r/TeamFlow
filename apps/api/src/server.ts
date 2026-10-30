import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger/logger.js";
import { prisma } from "./db/prisma.js";

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info("TeamFlow API listening", {
    host: env.API_HOST,
    port: env.API_PORT,
  });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  logger.error("TeamFlow API failed to start", { error });
  process.exitCode = 1;
  void prisma.$disconnect().catch((disconnectError: unknown) => {
    logger.error("TeamFlow API database shutdown failed", {
      error: disconnectError,
    });
  });
});

let isShuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info("TeamFlow API shutting down", { signal });

  const forceExit = setTimeout(() => {
    logger.error("TeamFlow API shutdown timed out", {
      timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);

  server.close((error) => {
    if (error) {
      logger.error("TeamFlow API failed to close HTTP server", { error });
      process.exitCode = 1;
    }

    void prisma
      .$disconnect()
      .then(() => {
        logger.info("TeamFlow API shutdown complete");
      })
      .catch((disconnectError: unknown) => {
        logger.error("TeamFlow API database shutdown failed", {
          error: disconnectError,
        });
        process.exitCode = 1;
      })
      .finally(() => {
        clearTimeout(forceExit);
      });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

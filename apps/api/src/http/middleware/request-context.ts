import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "../../core/logger/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

const REQUEST_ID_HEADER = "X-Request-Id";
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function createRequestContext(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const incomingRequestId = request.get(REQUEST_ID_HEADER);
    const requestId =
      incomingRequestId && VALID_REQUEST_ID.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();
    const startedAt = process.hrtime.bigint();
    const requestPath = request.path;

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      logger.info(`${request.method} ${requestPath}`, {
        requestId,
        status: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}

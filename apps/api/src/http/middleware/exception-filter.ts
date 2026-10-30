import type { ErrorRequestHandler } from "express";
import { HttpException } from "../exception.js";
import type { Logger } from "../../core/logger/logger.js";
import { sendError } from "../response.js";

export function createExceptionFilter(logger: Logger): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error instanceof HttpException) {
      return sendError(
        response,
        error.status,
        error.code,
        error.message,
        error.details,
      );
    }

    if (
      error instanceof SyntaxError &&
      "body" in error &&
      "status" in error &&
      error.status === 400
    ) {
      return sendError(
        response,
        400,
        "INVALID_JSON",
        "Request body is not valid JSON.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large"
    ) {
      return sendError(
        response,
        413,
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds the allowed size.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error.type === "charset.unsupported" ||
        error.type === "encoding.unsupported")
    ) {
      return sendError(
        response,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Request content type or encoding is not supported.",
      );
    }

    logger.error("Unhandled API error", {
      method: request.method,
      path: request.path,
      requestId: request.requestId,
      error,
    });

    return sendError(
      response,
      500,
      "INTERNAL_SERVER_ERROR",
      "Internal server error.",
    );
  };
}

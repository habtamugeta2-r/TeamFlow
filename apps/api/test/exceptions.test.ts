import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "../src/core/logger/logger.js";
import { createExceptionFilter } from "../src/http/middleware/exception-filter.js";
import { runWithErrorMap, ServiceError } from "../src/http/service-error.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exceptionFilter", () => {
  function createTestLogger(): Logger {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }

  it("does not treat inherited error-map properties as mapped errors", async () => {
    const error = new ServiceError("__proto__");

    await expect(
      runWithErrorMap({ NOT_FOUND: [404, "Not found."] }, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  function createJsonApp() {
    const app = express();
    const logger = createTestLogger();

    app.use(express.json());
    app.post("/payload", (_request, response) => {
      response.status(204).end();
    });
    app.use(createExceptionFilter(logger));

    return app;
  }

  it("logs request context without query-string data for unexpected errors", async () => {
    const logger = createTestLogger();
    const app = express();

    app.get("/failure", (_request, _response, next) => {
      next(new Error("unexpected failure"));
    });
    app.use(createExceptionFilter(logger));

    const response = await request(app).get(
      "/failure?token=must-not-be-logged",
    );

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled API error",
      expect.objectContaining({
        method: "GET",
        path: "/failure",
      }),
    );
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      "must-not-be-logged",
    );
  });

  it("returns a client error for an unsupported JSON charset", async () => {
    const response = await request(createJsonApp())
      .post("/payload")
      .set("Content-Type", "application/json; charset=unsupported")
      .send('{"value":true}');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns a client error for an unsupported content encoding", async () => {
    const response = await request(createJsonApp())
      .post("/payload")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", "unsupported")
      .send('{"value":true}');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });
});

import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app, createApp } from "../src/app.js";

describe("Health check endpoint", () => {
  it("should return a 200 status code and a JSON response with status 'ok'", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("adds baseline security headers and suppresses framework details", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
  });

  it("echoes valid request ids and replaces malformed ones", async () => {
    const echoed = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "trace-abc-123");
    const replaced = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "bad id with spaces");

    expect(echoed.headers["x-request-id"]).toBe("trace-abc-123");
    expect(replaced.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("reports database readiness through the injected health check", async () => {
    const application = createApp({
      checkDatabase: async () => {},
    });

    const response = await request(application).get("/api/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "connected" });
  });

  it("reports unavailable databases without exposing infrastructure errors", async () => {
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => {});
    const application = createApp({
      checkDatabase: async () => {
        throw new Error("database credentials must not be returned");
      },
    });

    try {
      const response = await request(application).get("/api/health/ready");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: "error",
        database: "unavailable",
      });
      expect(JSON.stringify(response.body)).not.toContain("credentials");
    } finally {
      errorLogger.mockRestore();
    }
  });

  it("uses the injected logger for health-check failures", async () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const application = createApp({
      logger,
      checkDatabase: async () => {
        throw new Error("database unavailable");
      },
    });

    const response = await request(application).get("/api/health/ready");

    expect(response.status).toBe(503);
    expect(logger.error).toHaveBeenCalledWith(
      "Database readiness check failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("does not include query strings in request logs", async () => {
    const requestLogger = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    try {
      await request(app).get("/api/health?token=must-not-be-logged");

      expect(requestLogger).toHaveBeenCalledOnce();
      expect(requestLogger.mock.calls.flat().join(" ")).not.toContain(
        "must-not-be-logged",
      );
      expect(requestLogger.mock.calls.flat().join(" ")).toContain(
        "GET /api/health",
      );
    } finally {
      requestLogger.mockRestore();
    }
  });
});

describe("API module registration", () => {
  it("mounts auth and workspace routes through the root application", async () => {
    const authResponse = await request(app).get("/api/auth/me");
    const workspaceResponse = await request(app).get("/api/workspaces");
    const tasksResponse = await request(app).get(
      "/api/workspaces/00000000-0000-4000-8000-000000000001/projects/00000000-0000-4000-8000-000000000002/tasks",
    );
    const activityResponse = await request(app).get(
      "/api/workspaces/00000000-0000-4000-8000-000000000001/activity",
    );

    expect(authResponse.status).toBe(401);
    expect(authResponse.body.error.code).toBe("UNAUTHENTICATED");
    expect(workspaceResponse.status).toBe(401);
    expect(workspaceResponse.body.error.code).toBe("UNAUTHENTICATED");
    expect(tasksResponse.status).toBe(401);
    expect(tasksResponse.body.error.code).toBe("UNAUTHENTICATED");
    expect(activityResponse.status).toBe(401);
    expect(activityResponse.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("API error handling", () => {
  it("returns a consistent 404 response for unknown routes", async () => {
    const response = await request(app).get("/api/nope");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });

  it("returns a consistent 400 response for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "test@example.com"');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "INVALID_JSON",
        message: "Request body is not valid JSON.",
      },
    });
  });

  it("returns a consistent 413 response for oversized JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ payload: "x".repeat(110 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds the allowed size.",
      },
    });
  });
});

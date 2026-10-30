import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createLogger } from "../src/core/logger/logger.js";
import { createExceptionFilter } from "../src/http/middleware/exception-filter.js";
import { createRateLimiter } from "../src/http/middleware/rate-limiter.js";
import { createRequireAuth } from "../src/modules/auth/auth.middleware.js";
import { createAuthController } from "../src/modules/auth/auth.controller.js";
import { createAuthRouter } from "../src/modules/auth/auth.routes.js";
import {
  AuthServiceError,
  type AuthService,
} from "../src/modules/auth/auth.service.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test User",
  email: "test@example.com",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createTestApp(
  authService: AuthService,
  credentialRateLimiter?: ReturnType<typeof createRateLimiter>,
) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    "/api/auth",
    createAuthRouter(
      createAuthController(authService),
      createRequireAuth(authService),
      credentialRateLimiter,
    ),
  );
  app.use(createExceptionFilter(createLogger()));

  return app;
}

function createAuthServiceStub(): AuthService {
  return {
    registerUser: vi.fn(async () => user),
    authenticateUser: vi.fn(async () => ({
      user,
      sessionToken: "opaque-session-token",
    })),
    findUserBySessionToken: vi.fn(async () => user),
    revokeSession: vi.fn(async () => {}),
  };
}

describe("auth routes", () => {
  it("registers an account and returns the public user", async () => {
    const authService = createAuthServiceStub();

    const response = await request(createTestApp(authService))
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "secure-password",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
    expect(authService.registerUser).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "secure-password",
    });
  });

  it("maps duplicate registrations to the established conflict response", async () => {
    const authService = createAuthServiceStub();
    vi.mocked(authService.registerUser).mockRejectedValue(
      new AuthServiceError("EMAIL_IN_USE"),
    );

    const response = await request(createTestApp(authService))
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "secure-password",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("sets the session cookie on login without returning the token", async () => {
    const response = await request(createTestApp(createAuthServiceStub()))
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "secure-password",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.id);
    expect(response.body).not.toHaveProperty("data.sessionToken");
    expect(response.headers["set-cookie"][0]).toContain(
      "teamflow_session=opaque-session-token",
    );
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Lax");
  });

  it("returns the authenticated user and revokes sessions on logout", async () => {
    const authService = createAuthServiceStub();
    const app = createTestApp(authService);
    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "teamflow_session=opaque-session-token");
    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "teamflow_session=opaque-session-token");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user.id).toBe(user.id);
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.data).toEqual({ success: true });
    expect(authService.revokeSession).toHaveBeenCalledWith(
      "opaque-session-token",
    );
    expect(logoutResponse.headers["set-cookie"][0]).toContain(
      "teamflow_session=",
    );
  });

  it("rejects current-user requests without a session cookie", async () => {
    const authService = createAuthServiceStub();

    const response = await request(createTestApp(authService)).get(
      "/api/auth/me",
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
    expect(authService.findUserBySessionToken).not.toHaveBeenCalled();
  });

  it("rate limits credential attempts and returns retry guidance", async () => {
    const authService = createAuthServiceStub();
    const credentialRateLimiter = createRateLimiter(createLogger("silent"), {
      windowMs: 60_000,
      max: 1,
    });
    const app = createTestApp(authService, credentialRateLimiter);
    const credentials = {
      email: "test@example.com",
      password: "secure-password",
    };

    const first = await request(app).post("/api/auth/login").send(credentials);
    const second = await request(app).post("/api/auth/login").send(credentials);

    expect(first.status).toBe(200);
    expect(first.headers["x-ratelimit-limit"]).toBe("1");
    expect(first.headers["x-ratelimit-remaining"]).toBe("0");
    expect(second.status).toBe(429);
    expect(second.headers["retry-after"]).toBeDefined();
    expect(second.body.error.code).toBe("RATE_LIMITED");
    expect(authService.authenticateUser).toHaveBeenCalledOnce();
  });
});

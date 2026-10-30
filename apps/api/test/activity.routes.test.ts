import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    activity: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    workspaceMembership: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../src/db/prisma.js";
import { createLogger } from "../src/core/logger/logger.js";
import { createExceptionFilter } from "../src/http/middleware/exception-filter.js";
import { createActivityController } from "../src/modules/activity/activity.controller.js";
import { createActivityRouter } from "../src/modules/activity/activity.routes.js";
import { createActivityService } from "../src/modules/activity/activity.service.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const activity = {
  id: "00000000-0000-4000-8000-000000000003",
  actorId: userId,
  actorName: "Former Member",
  actorEmail: "former@example.com",
  eventType: "TASK_COMPLETED",
  resourceType: "TASK",
  resourceId: "00000000-0000-4000-8000-000000000004",
  details: { from: "IN_PROGRESS", to: "DONE" },
  createdAt: new Date("2026-10-30T10:00:00.000Z"),
};

const requireTestUser: RequestHandler = (req, res, next) => {
  const authenticatedUserId = req.header("x-test-user-id");
  if (!authenticatedUserId) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        details: [],
      },
    });
    return;
  }

  Object.assign(req, {
    authUser: {
      id: authenticatedUserId,
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    },
  });
  next();
};

const app = express();
app.use(
  "/api/workspaces/:workspaceId/activity",
  createActivityRouter(
    createActivityController(createActivityService(prisma)),
    requireTestUser,
  ),
);
app.use(createExceptionFilter(createLogger("silent")));

const route = `/api/workspaces/${workspaceId}/activity`;
const findMembership = vi.mocked(prisma.workspaceMembership.findUnique);
const findActivities = vi.mocked(prisma.activity.findMany);
const countActivities = vi.mocked(prisma.activity.count);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workspace activity routes", () => {
  it("requires authentication", async () => {
    const response = await request(app).get(route);

    expect(response.status).toBe(401);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("returns filtered, paginated activity to workspace members", async () => {
    findMembership.mockResolvedValue({ userId } as never);
    findActivities.mockResolvedValue([activity] as never);
    countActivities.mockResolvedValue(23);

    const response = await request(app)
      .get(
        `${route}?eventType=TASK_COMPLETED&resourceType=TASK&page=2&limit=10`,
      )
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.data.activities[0]).toMatchObject({
      actorId: userId,
      actorName: "Former Member",
      actorEmail: "former@example.com",
      eventType: "TASK_COMPLETED",
    });
    expect(findActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId,
          eventType: "TASK_COMPLETED",
          resourceType: "TASK",
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 10,
        take: 10,
      }),
    );
    expect(response.body.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it("does not reveal activity to users outside the workspace", async () => {
    findMembership.mockResolvedValue(null as never);

    const response = await request(app)
      .get(route)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(findActivities).not.toHaveBeenCalled();
  });

  it.each(["?limit=101", "?page=0", "?eventType=SECRET", "?other=value"])(
    "rejects invalid activity query %s",
    async (query) => {
      const response = await request(app)
        .get(`${route}${query}`)
        .set("x-test-user-id", userId);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(findMembership).not.toHaveBeenCalled();
    },
  );
});

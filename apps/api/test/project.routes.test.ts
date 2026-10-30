import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    activity: {
      createMany: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    workspaceMembership: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../src/db/prisma.js";
import { createLogger } from "../src/core/logger/logger.js";
import { createExceptionFilter } from "../src/http/middleware/exception-filter.js";
import { createProjectController } from "../src/modules/projects/project.controller.js";
import { createProjectRouter } from "../src/modules/projects/project.routes.js";
import { createProjectService } from "../src/modules/projects/project.service.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const project = {
  id: projectId,
  workspaceId,
  name: "Launch planning",
  description: "Coordinate the launch.",
  archivedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const requireTestUser: RequestHandler = (request, response, next) => {
  const authenticatedUserId = request.header("x-test-user-id");
  if (!authenticatedUserId) {
    response.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        details: [],
      },
    });
    return;
  }

  Object.assign(request, {
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
app.use(express.json());
app.use(
  "/api/workspaces/:workspaceId/projects",
  createProjectRouter(
    createProjectController(createProjectService(prisma)),
    requireTestUser,
  ),
);
app.use(createExceptionFilter(createLogger("silent")));

const findMembership = vi.mocked(prisma.workspaceMembership.findUnique);
const findProjects = vi.mocked(prisma.project.findMany);
const findProject = vi.mocked(prisma.project.findFirst);
const createProject = vi.mocked(prisma.project.create);
const updateProject = vi.mocked(prisma.project.update);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(
    (operation) =>
      (operation as (transaction: never) => Promise<unknown>)(
        prisma as never,
      ) as never,
  );
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    name: "Test User",
    email: "test@example.com",
  } as never);
  vi.mocked(prisma.activity.createMany).mockResolvedValue({ count: 1 });
});

describe("project routes", () => {
  it("requires authentication", async () => {
    const response = await request(app).get(
      `/api/workspaces/${workspaceId}/projects`,
    );

    expect(response.status).toBe(401);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("lists projects only after confirming workspace membership", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProjects.mockResolvedValue([project] as never);

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.data.projects[0].name).toBe("Launch planning");
    expect(findMembership).toHaveBeenCalledWith({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    expect(findProjects).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId } }),
    );
  });

  it("creates projects for workspace members and trims input", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    createProject.mockResolvedValue(project as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set("x-test-user-id", userId)
      .send({ name: "  Launch planning  ", description: "  Coordinate it.  " });

    expect(response.status).toBe(201);
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          workspaceId,
          name: "Launch planning",
          description: "Coordinate it.",
        },
      }),
    );
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          workspaceId,
          actorId: userId,
          actorName: "Test User",
          actorEmail: "test@example.com",
          eventType: "PROJECT_CREATED",
          resourceType: "PROJECT",
          resourceId: projectId,
          details: { name: project.name },
        }),
      ],
    });
  });

  it("rejects invalid project input before querying membership", async () => {
    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set("x-test-user-id", userId)
      .send({ name: "A" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("does not reveal a project from another workspace", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(findProject).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: projectId, workspaceId } }),
    );
  });

  it("lets members read archived projects", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({
      ...project,
      archivedAt: new Date(),
    } as never);

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.data.project.archivedAt).toBeTruthy();
  });

  it("blocks members from updating project metadata", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/projects/${projectId}`)
      .set("x-test-user-id", userId)
      .send({ name: "Updated name" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("lets admins update metadata and clear a description", async () => {
    findMembership.mockResolvedValue({ role: "ADMIN" } as never);
    findProject.mockResolvedValue(project as never);
    updateProject.mockResolvedValue({ ...project, description: null } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/projects/${projectId}`)
      .set("x-test-user-id", userId)
      .send({ description: null });

    expect(response.status).toBe(200);
    expect(updateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId, workspaceId },
        data: { description: null },
      }),
    );
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: "PROJECT_UPDATED",
          resourceId: projectId,
          details: {
            changes: {
              description: {
                from: "Coordinate the launch.",
                to: null,
              },
            },
          },
        }),
      ],
    });
  });

  it("restricts archival to owners and admins", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects/${projectId}/archive`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("archives projects and returns the archived record", async () => {
    findMembership.mockResolvedValue({ role: "OWNER" } as never);
    findProject.mockResolvedValue(project as never);
    updateProject.mockResolvedValue({
      ...project,
      archivedAt: new Date("2026-01-02T00:00:00.000Z"),
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects/${projectId}/archive`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.data.project.archivedAt).toBeTruthy();
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: "PROJECT_ARCHIVED",
          resourceId: projectId,
        }),
      ],
    });
  });

  it("does not update a project that is already archived", async () => {
    const archivedProject = { ...project, archivedAt: new Date() };
    findMembership.mockResolvedValue({ role: "ADMIN" } as never);
    findProject.mockResolvedValue(archivedProject as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects/${projectId}/archive`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(updateProject).not.toHaveBeenCalled();
  });
});

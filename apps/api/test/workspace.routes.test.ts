import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    workspaceMembership: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../src/db/prisma.js";
import { Prisma } from "../src/generated/prisma/client.js";
import { createLogger } from "../src/core/logger/logger.js";
import { createExceptionFilter } from "../src/http/middleware/exception-filter.js";
import { createWorkspaceController } from "../src/modules/workspaces/workspace.controller.js";
import { createWorkspaceRouter } from "../src/modules/workspaces/workspace.routes.js";
import { createWorkspaceService } from "../src/modules/workspaces/workspace.service.js";

const requireTestUser: RequestHandler = (request, response, next) => {
  const userId = request.header("x-test-user-id");

  if (!userId) {
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
      id: userId,
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
  "/api/workspaces",
  createWorkspaceRouter(
    createWorkspaceController(createWorkspaceService(prisma)),
    requireTestUser,
  ),
);
app.use(createExceptionFilter(createLogger()));

const workspaceId = "00000000-0000-4000-8000-000000000001";

const updatedWorkspace = {
  id: workspaceId,
  name: "Updated Engineering Team",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const findMembership = vi.mocked(prisma.workspaceMembership.findUnique);
const listMemberships = vi.mocked(prisma.workspaceMembership.findMany);

const updateWorkspace = vi.mocked(prisma.workspace.update);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/workspaces", () => {
  it("creates a workspace and returns its owner membership", async () => {
    const workspace = {
      id: workspaceId,
      name: "Engineering Team",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const membership = {
      id: "00000000-0000-4000-8000-000000000002",
      workspaceId,
      userId: "user-123",
      role: "OWNER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const transactionWorkspaceCreate = vi.fn().mockResolvedValue(workspace);
    const transactionMembershipCreate = vi.fn().mockResolvedValue(membership);
    const transactionClient = {
      workspace: {
        create: transactionWorkspaceCreate,
      },
      workspaceMembership: {
        create: transactionMembershipCreate,
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation((operation) =>
      (operation as (transaction: never) => Promise<unknown>)(
        transactionClient as never,
      ),
    );

    const response = await request(app)
      .post("/api/workspaces")
      .set("x-test-user-id", "user-123")
      .send({ name: "  Engineering Team  " });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      membership: {
        ...membership,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(transactionWorkspaceCreate).toHaveBeenCalledWith({
      data: { name: "Engineering Team" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(transactionMembershipCreate).toHaveBeenCalledWith({
      data: {
        workspaceId,
        userId: "user-123",
        role: "OWNER",
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("rejects invalid workspace names without writing to the database", async () => {
    const response = await request(app)
      .post("/api/workspaces")
      .set("x-test-user-id", "user-123")
      .send({ name: "A" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("GET /api/workspaces", () => {
  it("returns only workspaces belonging to the authenticated user", async () => {
    listMemberships.mockResolvedValue([
      {
        role: "OWNER",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        workspace: updatedWorkspace,
      },
    ] as never);

    const response = await request(app)
      .get("/api/workspaces")
      .set("x-test-user-id", "user-123");

    expect(response.status).toBe(200);
    expect(response.body.data.workspaces).toEqual([
      {
        ...updatedWorkspace,
        createdAt: updatedWorkspace.createdAt.toISOString(),
        updatedAt: updatedWorkspace.updatedAt.toISOString(),
        membership: {
          role: "OWNER",
          joinedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ]);
    expect(prisma.workspaceMembership.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      select: {
        role: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("GET /api/workspaces/:workspaceId", () => {
  it("returns workspace details and the caller's membership", async () => {
    findMembership.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000002",
      role: "MEMBER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      workspace: updatedWorkspace,
    } as never);

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      workspace: {
        ...updatedWorkspace,
        createdAt: updatedWorkspace.createdAt.toISOString(),
        updatedAt: updatedWorkspace.updatedAt.toISOString(),
      },
      membership: {
        id: "00000000-0000-4000-8000-000000000002",
        role: "MEMBER",
        joinedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(prisma.workspaceMembership.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: "user-123",
        },
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  it("returns not found when the caller is not a workspace member", async () => {
    findMembership.mockResolvedValue(null as never);

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/workspaces/:workspaceId", () => {
  it.each(["OWNER", "ADMIN"] as const)(
    "allows a %s to update a workspace",
    async (role) => {
      findMembership.mockResolvedValue({ role } as never);
      updateWorkspace.mockResolvedValue(updatedWorkspace as never);

      const response = await request(app)
        .patch(`/api/workspaces/${workspaceId}`)
        .set("x-test-user-id", "user-123")
        .send({ name: "Updated Engineering Team" });

      expect(response.status).toBe(200);

      expect(response.body.data.workspace).toMatchObject({
        id: workspaceId,
        name: "Updated Engineering Team",
      });

      expect(updateWorkspace).toHaveBeenCalledWith({
        where: {
          id: workspaceId,
          memberships: {
            some: {
              userId: "user-123",
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
        data: { name: "Updated Engineering Team" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    },
  );

  it("rejects a MEMBER who tries to update a workspace", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123")
      .send({ name: "Unauthorized Update" });

    expect(response.status).toBe(403);

    expect(response.body.error.code).toBe("FORBIDDEN");

    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it("returns 404 when the user is not a workspace member", async () => {
    findMembership.mockResolvedValue(null as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-456")
      .send({ name: "Unauthorized Update" });

    expect(response.status).toBe(404);

    expect(response.body.error.code).toBe("NOT_FOUND");

    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it("rechecks authorization when membership changes before the update", async () => {
    findMembership
      .mockResolvedValueOnce({ role: "OWNER" } as never)
      .mockResolvedValueOnce({ role: "MEMBER" } as never);
    updateWorkspace.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123")
      .send({ name: "Updated Engineering Team" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(findMembership).toHaveBeenCalledTimes(2);
    expect(updateWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: workspaceId,
          memberships: {
            some: {
              userId: "user-123",
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
      }),
    );
  });

  it("rejects requests without authentication", async () => {
    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .send({ name: "Updated Engineering Team" });

    expect(response.status).toBe(401);

    expect(response.body.error.code).toBe("UNAUTHENTICATED");

    expect(findMembership).not.toHaveBeenCalled();
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it("rejects an invalid workspace ID", async () => {
    const response = await request(app)
      .patch("/api/workspaces/not-a-uuid")
      .set("x-test-user-id", "user-123")
      .send({ name: "Updated Engineering Team" });

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    expect(findMembership).not.toHaveBeenCalled();
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it("returns a generic internal error when membership lookup fails", async () => {
    findMembership.mockRejectedValue(new Error("database credentials leaked"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123")
      .send({ name: "Updated Engineering Team" });

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
      details: [],
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "database credentials leaked",
    );

    errorLog.mockRestore();
  });

  it("rejects an invalid workspace name", async () => {
    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", "user-123")
      .send({ name: "A" });

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    expect(findMembership).not.toHaveBeenCalled();
    expect(updateWorkspace).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/workspaces/:workspaceId", () => {
  const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

  const ownerId = "550e8400-e29b-41d4-a716-446655440001";
  const adminId = "550e8400-e29b-41d4-a716-446655440002";
  const memberId = "550e8400-e29b-41d4-a716-446655440003";
  const nonMemberId = "550e8400-e29b-41d4-a716-446655440004";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the owner to delete a workspace", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValue({
      role: "OWNER",
    } as never);

    vi.mocked(prisma.workspace.delete).mockResolvedValue({
      id: workspaceId,
    } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", ownerId);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    expect(prisma.workspace.delete).toHaveBeenCalledWith({
      where: {
        id: workspaceId,
        memberships: {
          some: {
            userId: ownerId,
            role: "OWNER",
          },
        },
      },
    });
  });

  it("prevents an admin from deleting a workspace", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValue({
      role: "ADMIN",
    } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", adminId);

    expect(response.status).toBe(403);
    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });

  it("prevents a member from deleting a workspace", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValue({
      role: "MEMBER",
    } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", memberId);

    expect(response.status).toBe(403);
    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the user is not a workspace member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValue(
      null as never,
    );

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("x-test-user-id", nonMemberId);

    expect(response.status).toBe(404);
    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(app).delete(
      `/api/workspaces/${workspaceId}`,
    );

    expect(response.status).toBe(401);
    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });

  it("rejects an invalid workspace ID", async () => {
    const response = await request(app)
      .delete("/api/workspaces/not-a-uuid")
      .set("x-test-user-id", ownerId);

    expect(response.status).toBe(400);
    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });
});

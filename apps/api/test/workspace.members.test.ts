import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    workspaceMembership: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const requireTestUser: RequestHandler = (req, res, next) => {
  const userId = req.header("x-test-user-id");

  if (!userId) {
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
const otherWorkspaceId = "00000000-0000-4000-8000-000000000002";
const ownerId = "00000000-0000-4000-8000-000000000010";
const adminId = "00000000-0000-4000-8000-000000000020";
const memberId = "00000000-0000-4000-8000-000000000030";
const targetUserId = "00000000-0000-4000-8000-000000000040";

const ownerMembershipId = "00000000-0000-4000-8000-000000000091";
const adminMembershipId = "00000000-0000-4000-8000-000000000092";
const memberMembershipId = "00000000-0000-4000-8000-000000000093";
const targetMembershipId = "00000000-0000-4000-8000-000000000094";
const otherAdminMembershipId = "00000000-0000-4000-8000-000000000095";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces/:workspaceId/members", () => {
  it("lists all members for a workspace member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      id: memberMembershipId,
      role: "MEMBER",
      userId: memberId,
      workspaceId,
    } as never);

    const mockMembers = [
      {
        id: ownerMembershipId,
        workspaceId,
        userId: ownerId,
        role: "OWNER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: ownerId, name: "Owner", email: "owner@example.com" },
      },
      {
        id: memberMembershipId,
        workspaceId,
        userId: memberId,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: memberId, name: "Member", email: "member@example.com" },
      },
    ];

    vi.mocked(prisma.workspaceMembership.findMany).mockResolvedValueOnce(
      mockMembers as never,
    );

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", memberId);

    expect(response.status).toBe(200);
    expect(response.body.data.members).toHaveLength(2);
  });

  it("returns 404 for a non-member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce(
      null as never,
    );

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", "non-member");

    expect(response.status).toBe(404);
  });
});

describe("POST /api/workspaces/:workspaceId/members", () => {
  it("allows workspace owner to add a member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce(null as never); // Not already a member

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: targetUserId,
      email: "newuser@example.com",
    } as never);

    vi.mocked(prisma.workspaceMembership.create).mockResolvedValueOnce({
      id: targetMembershipId,
      workspaceId,
      userId: targetUserId,
      role: "MEMBER",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: targetUserId,
        name: "New User",
        email: "newuser@example.com",
      },
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", ownerId)
      .send({ email: "newuser@example.com" });

    expect(response.status).toBe(201);
    expect(response.body.data.membership.role).toBe("MEMBER");
  });

  it("allows workspace admin to add a regular member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: adminMembershipId,
        role: "ADMIN",
        userId: adminId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce(null as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: targetUserId,
      email: "newuser@example.com",
    } as never);

    vi.mocked(prisma.workspaceMembership.create).mockResolvedValueOnce({
      id: targetMembershipId,
      workspaceId,
      userId: targetUserId,
      role: "MEMBER",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: targetUserId,
        name: "New User",
        email: "newuser@example.com",
      },
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", adminId)
      .send({ email: "newuser@example.com" });

    expect(response.status).toBe(201);
  });

  it("prevents admin from creating another admin", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      id: adminMembershipId,
      role: "ADMIN",
      userId: adminId,
      workspaceId,
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", adminId)
      .send({ email: "newuser@example.com", role: "ADMIN" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("prevents regular member from adding members", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      id: memberMembershipId,
      role: "MEMBER",
      userId: memberId,
      workspaceId,
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", memberId)
      .send({ email: "newuser@example.com" });

    expect(response.status).toBe(403);
  });

  it("returns 404 when target email does not exist", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      id: ownerMembershipId,
      role: "OWNER",
      userId: ownerId,
      workspaceId,
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", ownerId)
      .send({ email: "nonexistent@example.com" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 409 when user is already a member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: "existing-id",
      } as never); // Already member

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: targetUserId,
      email: "already@example.com",
    } as never);

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", ownerId)
      .send({ email: "already@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_MEMBER");
  });

  it("returns 409 when a concurrent request adds the same member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce(null as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: targetUserId,
      email: "already@example.com",
    } as never);

    vi.mocked(prisma.workspaceMembership.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const response = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("x-test-user-id", ownerId)
      .send({ email: "already@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_MEMBER");
  });
});

describe("PATCH /api/workspaces/:workspaceId/members/:membershipId", () => {
  it("allows owner to promote a member to admin", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId,
        userId: targetUserId,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: targetUserId, name: "User", email: "user@example.com" },
      } as never);

    vi.mocked(prisma.workspaceMembership.update).mockResolvedValueOnce({
      id: targetMembershipId,
      workspaceId,
      userId: targetUserId,
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: targetUserId, name: "User", email: "user@example.com" },
    } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", ownerId)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(200);
    expect(response.body.data.membership.role).toBe("ADMIN");
  });

  it("prevents admin from changing member roles", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      id: adminMembershipId,
      role: "ADMIN",
      userId: adminId,
      workspaceId,
    } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", adminId)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows owner to transfer ownership in a transaction", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId,
        userId: targetUserId,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: targetUserId, name: "User", email: "user@example.com" },
      } as never);

    const claimOwnership = vi.fn().mockResolvedValue({ count: 1 });
    const transferOwnership = vi.fn().mockImplementation(({ data }) => ({
      id: targetMembershipId,
      workspaceId,
      userId: targetUserId,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: targetUserId, name: "User", email: "user@example.com" },
    }));
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      const tx = {
        workspaceMembership: {
          updateMany: claimOwnership,
          update: transferOwnership,
        },
      };
      return callback(tx as never);
    });

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", ownerId)
      .send({ role: "OWNER" });

    expect(response.status).toBe(200);
    expect(response.body.data.membership.role).toBe("OWNER");
    expect(response.body.data.previousOwnerRole).toBe("ADMIN");
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(claimOwnership).toHaveBeenCalledWith({
      where: { id: ownerMembershipId, role: "OWNER" },
      data: { role: "ADMIN" },
    });
    expect(transferOwnership).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetMembershipId, workspaceId },
        data: { role: "OWNER" },
      }),
    );
  });

  it("does not transfer ownership to a membership in another workspace", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId: otherWorkspaceId,
        userId: targetUserId,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: targetUserId, name: "User", email: "user@example.com" },
      } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", ownerId)
      .send({ role: "OWNER" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a stale concurrent ownership transfer", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId,
        userId: targetUserId,
        role: "MEMBER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: targetUserId, name: "User", email: "user@example.com" },
      } as never);

    const updateTarget = vi.fn();
    const claimOwnership = vi.fn().mockResolvedValue({ count: 0 });
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      const tx = {
        workspaceMembership: {
          updateMany: claimOwnership,
          update: updateTarget,
        },
      };
      return callback(tx as never);
    });

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", ownerId)
      .send({ role: "OWNER" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(claimOwnership).toHaveBeenCalledWith({
      where: { id: ownerMembershipId, role: "OWNER" },
      data: { role: "ADMIN" },
    });
    expect(updateTarget).not.toHaveBeenCalled();
  });

  it("prevents directly demoting the owner without transfer", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        workspaceId,
        userId: ownerId,
        role: "OWNER",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: ownerId, name: "Owner", email: "owner@example.com" },
      } as never);

    const response = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${ownerMembershipId}`)
      .set("x-test-user-id", ownerId)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CANNOT_DEMOTE_OWNER");
  });
});

describe("DELETE /api/workspaces/:workspaceId/members/:membershipId", () => {
  it("allows a member to leave the workspace", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: memberMembershipId,
        role: "MEMBER",
        userId: memberId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: memberMembershipId,
        workspaceId,
        userId: memberId,
        role: "MEMBER",
      } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberMembershipId}`)
      .set("x-test-user-id", memberId);

    expect(response.status).toBe(204);
    expect(prisma.workspaceMembership.delete).toHaveBeenCalledWith({
      where: { id: memberMembershipId },
    });
  });

  it("prevents owner from leaving workspace without transfer", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        role: "OWNER",
        userId: ownerId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        workspaceId,
        userId: ownerId,
        role: "OWNER",
      } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${ownerMembershipId}`)
      .set("x-test-user-id", ownerId);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CANNOT_REMOVE_OWNER");
    expect(prisma.workspaceMembership.delete).not.toHaveBeenCalled();
  });

  it("allows admin to remove a regular member", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: adminMembershipId,
        role: "ADMIN",
        userId: adminId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId,
        userId: targetUserId,
        role: "MEMBER",
      } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", adminId);

    expect(response.status).toBe(204);
    expect(prisma.workspaceMembership.delete).toHaveBeenCalledWith({
      where: { id: targetMembershipId },
    });
  });

  it("prevents admin from removing another admin", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: adminMembershipId,
        role: "ADMIN",
        userId: adminId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: otherAdminMembershipId,
        workspaceId,
        userId: "other-admin-id",
        role: "ADMIN",
      } as never);

    const response = await request(app)
      .delete(
        `/api/workspaces/${workspaceId}/members/${otherAdminMembershipId}`,
      )
      .set("x-test-user-id", adminId);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prisma.workspaceMembership.delete).not.toHaveBeenCalled();
  });

  it("prevents admin from removing the workspace owner", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: adminMembershipId,
        role: "ADMIN",
        userId: adminId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: ownerMembershipId,
        workspaceId,
        userId: ownerId,
        role: "OWNER",
      } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${ownerMembershipId}`)
      .set("x-test-user-id", adminId);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prisma.workspaceMembership.delete).not.toHaveBeenCalled();
  });

  it("prevents regular member from removing anyone else", async () => {
    vi.mocked(prisma.workspaceMembership.findUnique)
      .mockResolvedValueOnce({
        id: memberMembershipId,
        role: "MEMBER",
        userId: memberId,
        workspaceId,
      } as never)
      .mockResolvedValueOnce({
        id: targetMembershipId,
        workspaceId,
        userId: targetUserId,
        role: "MEMBER",
      } as never);

    const response = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${targetMembershipId}`)
      .set("x-test-user-id", memberId);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(prisma.workspaceMembership.delete).not.toHaveBeenCalled();
  });
});

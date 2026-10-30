import { Prisma } from "../../generated/prisma/client.js";
import type {
  PrismaClient,
  WorkspaceRole,
} from "../../generated/prisma/client.js";
import { ServiceError } from "../../http/service-error.js";
import type { WorkspaceErrorCode } from "./workspace.errors.js";

/* ───────── Prisma select projections ───────── */

const workspaceSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

const memberUserSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const membershipDetailSelect = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: memberUserSelect,
  },
} as const;

/* ───────── Domain error ───────── */

export class WorkspaceServiceError extends ServiceError<WorkspaceErrorCode> {
  constructor(code: WorkspaceErrorCode) {
    super(code);
    this.name = "WorkspaceServiceError";
  }
}

/* ───────── Service ───────── */

export class WorkspaceService {
  constructor(private readonly database: PrismaClient) {}

  private async requireMembership(workspaceId: string, userId: string) {
    const membership = await this.database.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        userId: true,
        workspaceId: true,
      },
    });

    if (!membership) {
      throw new WorkspaceServiceError("NOT_FOUND");
    }

    return membership;
  }

  private isPrismaNotFound(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    );
  }

  async createWorkspace(userId: string, name: string) {
    return this.database.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: { name },
        select: workspaceSelect,
      });

      const membership = await transaction.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId,
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

      return { workspace, membership };
    });
  }

  async listUserWorkspaces(userId: string) {
    const memberships = await this.database.workspaceMembership.findMany({
      where: { userId },
      select: {
        role: true,
        createdAt: true,
        workspace: {
          select: workspaceSelect,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return memberships.map((membership) => ({
      ...membership.workspace,
      membership: {
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    }));
  }

  async getUserWorkspace(workspaceId: string, userId: string) {
    const membership = await this.database.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        workspace: {
          select: workspaceSelect,
        },
      },
    });

    if (!membership) {
      throw new WorkspaceServiceError("NOT_FOUND");
    }

    return {
      workspace: membership.workspace,
      membership: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    };
  }

  async updateWorkspace(workspaceId: string, userId: string, name: string) {
    const membership = await this.requireMembership(workspaceId, userId);

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new WorkspaceServiceError("FORBIDDEN_UPDATE");
    }

    try {
      const workspace = await this.database.workspace.update({
        where: {
          id: workspaceId,
          memberships: {
            some: {
              userId,
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
        data: { name },
        select: workspaceSelect,
      });

      return { workspace };
    } catch (error) {
      if (!this.isPrismaNotFound(error)) {
        throw error;
      }

      const currentMembership = await this.requireMembership(
        workspaceId,
        userId,
      );

      if (
        currentMembership.role !== "OWNER" &&
        currentMembership.role !== "ADMIN"
      ) {
        throw new WorkspaceServiceError("FORBIDDEN_UPDATE");
      }

      throw new WorkspaceServiceError("NOT_FOUND");
    }
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const membership = await this.requireMembership(workspaceId, userId);

    if (membership.role !== "OWNER") {
      throw new WorkspaceServiceError("FORBIDDEN_DELETE");
    }

    try {
      await this.database.workspace.delete({
        where: {
          id: workspaceId,
          memberships: {
            some: {
              userId,
              role: "OWNER",
            },
          },
        },
      });
    } catch (error) {
      if (!this.isPrismaNotFound(error)) {
        throw error;
      }

      const currentMembership = await this.requireMembership(
        workspaceId,
        userId,
      );

      if (currentMembership.role !== "OWNER") {
        throw new WorkspaceServiceError("FORBIDDEN_DELETE");
      }

      throw new WorkspaceServiceError("NOT_FOUND");
    }
  }

  async listWorkspaceMembers(workspaceId: string, userId: string) {
    await this.requireMembership(workspaceId, userId);

    const members = await this.database.workspaceMembership.findMany({
      where: { workspaceId },
      select: membershipDetailSelect,
      orderBy: { createdAt: "asc" },
    });

    return { members };
  }

  async addWorkspaceMember(
    workspaceId: string,
    actorUserId: string,
    input: { email: string; role?: "ADMIN" | "MEMBER" },
  ) {
    const actorMembership = await this.requireMembership(
      workspaceId,
      actorUserId,
    );

    if (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN") {
      throw new WorkspaceServiceError("FORBIDDEN_ADD_MEMBER");
    }

    const assignedRole: WorkspaceRole = input.role ?? "MEMBER";

    if (assignedRole === "ADMIN" && actorMembership.role !== "OWNER") {
      throw new WorkspaceServiceError("FORBIDDEN_ADD_ADMIN");
    }

    const targetUser = await this.database.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!targetUser) {
      throw new WorkspaceServiceError("USER_NOT_FOUND");
    }

    const existingMembership =
      await this.database.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: targetUser.id,
          },
        },
      });

    if (existingMembership) {
      throw new WorkspaceServiceError("ALREADY_MEMBER");
    }

    try {
      const membership = await this.database.workspaceMembership.create({
        data: {
          workspaceId,
          userId: targetUser.id,
          role: assignedRole,
        },
        select: membershipDetailSelect,
      });

      return { membership };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new WorkspaceServiceError("ALREADY_MEMBER");
      }

      throw error;
    }
  }

  async updateMemberRole(
    workspaceId: string,
    actorUserId: string,
    membershipId: string,
    newRole: "OWNER" | "ADMIN" | "MEMBER",
  ) {
    const actorMembership = await this.requireMembership(
      workspaceId,
      actorUserId,
    );

    if (actorMembership.role !== "OWNER") {
      throw new WorkspaceServiceError("FORBIDDEN_ROLE_CHANGE");
    }

    const targetMembership = await this.database.workspaceMembership.findUnique(
      {
        where: { id: membershipId },
        select: membershipDetailSelect,
      },
    );

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new WorkspaceServiceError("NOT_FOUND");
    }

    if (targetMembership.role === "OWNER") {
      if (newRole === "OWNER") {
        return { membership: targetMembership };
      }
      throw new WorkspaceServiceError("CANNOT_DEMOTE_OWNER");
    }

    if (newRole === "OWNER") {
      return this.database.$transaction(async (transaction) => {
        const ownershipClaim = await transaction.workspaceMembership.updateMany(
          {
            where: { id: actorMembership.id, role: "OWNER" },
            data: { role: "ADMIN" },
          },
        );

        if (ownershipClaim.count !== 1) {
          throw new WorkspaceServiceError("FORBIDDEN_ROLE_CHANGE");
        }

        const updatedTarget = await transaction.workspaceMembership.update({
          where: { id: membershipId, workspaceId },
          data: { role: "OWNER" },
          select: membershipDetailSelect,
        });

        return {
          membership: updatedTarget,
          previousOwnerRole: "ADMIN" as const,
        };
      });
    }

    const updated = await this.database.workspaceMembership.update({
      where: { id: membershipId },
      data: { role: newRole },
      select: membershipDetailSelect,
    });

    return { membership: updated };
  }

  async removeWorkspaceMember(
    workspaceId: string,
    actorUserId: string,
    membershipId: string,
  ) {
    const actorMembership = await this.requireMembership(
      workspaceId,
      actorUserId,
    );

    const targetMembership = await this.database.workspaceMembership.findUnique(
      {
        where: { id: membershipId },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
        },
      },
    );

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new WorkspaceServiceError("NOT_FOUND");
    }

    const isSelf = targetMembership.userId === actorUserId;

    if (isSelf) {
      if (actorMembership.role === "OWNER") {
        throw new WorkspaceServiceError("CANNOT_REMOVE_OWNER");
      }
      await this.database.workspaceMembership.delete({
        where: { id: membershipId },
      });
      return;
    }

    if (actorMembership.role === "MEMBER") {
      throw new WorkspaceServiceError("FORBIDDEN_REMOVE_MEMBER");
    }

    if (actorMembership.role === "ADMIN") {
      if (
        targetMembership.role === "OWNER" ||
        targetMembership.role === "ADMIN"
      ) {
        throw new WorkspaceServiceError("FORBIDDEN_REMOVE_MEMBER");
      }
    }

    await this.database.workspaceMembership.delete({
      where: { id: membershipId },
    });
  }
}

export function createWorkspaceService(
  database: PrismaClient,
): WorkspaceService {
  return new WorkspaceService(database);
}

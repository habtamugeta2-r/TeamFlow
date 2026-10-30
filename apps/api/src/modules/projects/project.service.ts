import {
  Prisma,
  type PrismaClient,
  type WorkspaceRole,
} from "../../generated/prisma/client.js";
import { ServiceError } from "../../http/service-error.js";
import { recordActivities } from "../activity/activity.record.js";
import type { ProjectErrorCode } from "./project.errors.js";

const projectSelect = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class ProjectServiceError extends ServiceError<ProjectErrorCode> {
  constructor(code: ProjectErrorCode) {
    super(code);
    this.name = "ProjectServiceError";
  }
}

export class ProjectService {
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
        role: true,
      },
    });

    if (!membership) {
      throw new ProjectServiceError("NOT_FOUND");
    }

    return membership;
  }

  private async requireProject(workspaceId: string, projectId: string) {
    const project = await this.database.project.findFirst({
      where: { id: projectId, workspaceId },
      select: projectSelect,
    });

    if (!project) {
      throw new ProjectServiceError("NOT_FOUND");
    }

    return project;
  }

  private canManage(role: WorkspaceRole): boolean {
    return role === "OWNER" || role === "ADMIN";
  }

  private isPrismaNotFound(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    );
  }

  async listProjects(workspaceId: string, userId: string) {
    await this.requireMembership(workspaceId, userId);

    const projects = await this.database.project.findMany({
      where: { workspaceId },
      select: projectSelect,
      orderBy: { createdAt: "desc" },
    });

    return { projects };
  }

  async createProject(
    workspaceId: string,
    userId: string,
    input: { name: string; description?: string },
  ) {
    await this.requireMembership(workspaceId, userId);

    return this.database.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          workspaceId,
          name: input.name,
          description: input.description,
        },
        select: projectSelect,
      });

      await recordActivities(transaction, userId, [
        {
          workspaceId,
          eventType: "PROJECT_CREATED",
          resourceType: "PROJECT",
          resourceId: project.id,
          details: { name: project.name },
        },
      ]);

      return { project };
    });
  }

  async getProject(workspaceId: string, userId: string, projectId: string) {
    await this.requireMembership(workspaceId, userId);
    const project = await this.requireProject(workspaceId, projectId);
    return { project };
  }

  async updateProject(
    workspaceId: string,
    userId: string,
    projectId: string,
    input: { name?: string; description?: string | null },
  ) {
    const membership = await this.requireMembership(workspaceId, userId);
    if (!this.canManage(membership.role)) {
      throw new ProjectServiceError("FORBIDDEN_UPDATE");
    }

    const currentProject = await this.requireProject(workspaceId, projectId);
    try {
      return await this.database.$transaction(async (transaction) => {
        const project = await transaction.project.update({
          where: { id: projectId, workspaceId },
          data: input,
          select: projectSelect,
        });
        const changes: Record<
          string,
          { from: string | null; to: string | null }
        > = {};

        if (input.name !== undefined && currentProject.name !== project.name) {
          changes.name = { from: currentProject.name, to: project.name };
        }
        if (
          input.description !== undefined &&
          currentProject.description !== project.description
        ) {
          changes.description = {
            from: currentProject.description,
            to: project.description,
          };
        }

        await recordActivities(
          transaction,
          userId,
          Object.keys(changes).length > 0
            ? [
                {
                  workspaceId,
                  eventType: "PROJECT_UPDATED",
                  resourceType: "PROJECT",
                  resourceId: project.id,
                  details: { changes },
                },
              ]
            : [],
        );

        return { project };
      });
    } catch (error) {
      if (this.isPrismaNotFound(error)) {
        throw new ProjectServiceError("NOT_FOUND");
      }
      throw error;
    }
  }

  async archiveProject(workspaceId: string, userId: string, projectId: string) {
    const membership = await this.requireMembership(workspaceId, userId);
    if (!this.canManage(membership.role)) {
      throw new ProjectServiceError("FORBIDDEN_ARCHIVE");
    }

    const currentProject = await this.requireProject(workspaceId, projectId);
    if (currentProject.archivedAt) {
      return { project: currentProject };
    }

    try {
      return await this.database.$transaction(async (transaction) => {
        const project = await transaction.project.update({
          where: { id: projectId, workspaceId },
          data: { archivedAt: new Date() },
          select: projectSelect,
        });
        await recordActivities(transaction, userId, [
          {
            workspaceId,
            eventType: "PROJECT_ARCHIVED",
            resourceType: "PROJECT",
            resourceId: project.id,
            details: { name: project.name },
          },
        ]);

        return { project };
      });
    } catch (error) {
      if (this.isPrismaNotFound(error)) {
        throw new ProjectServiceError("NOT_FOUND");
      }
      throw error;
    }
  }
}

export function createProjectService(database: PrismaClient): ProjectService {
  return new ProjectService(database);
}

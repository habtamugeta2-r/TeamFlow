import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ServiceError } from "../../http/service-error.js";
import { recordActivities } from "../activity/activity.record.js";
import type { TaskErrorCode } from "./task.errors.js";
import type {
  CreateTaskInput,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from "./task.schemas.js";

const taskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assigneeId: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const allowedStatusTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "DONE"],
  DONE: ["TODO", "IN_PROGRESS"],
};

export class TaskServiceError extends ServiceError<TaskErrorCode> {
  constructor(code: TaskErrorCode) {
    super(code);
    this.name = "TaskServiceError";
  }
}

export class TaskService {
  constructor(private readonly database: PrismaClient) {}

  private async requireProject(workspaceId: string, projectId: string) {
    const project = await this.database.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, archivedAt: true },
    });

    if (!project) {
      throw new TaskServiceError("NOT_FOUND");
    }

    return project;
  }

  private async requireActiveProject(workspaceId: string, projectId: string) {
    const project = await this.requireProject(workspaceId, projectId);

    if (project.archivedAt) {
      throw new TaskServiceError("PROJECT_ARCHIVED");
    }

    return project;
  }

  private async requireMembership(workspaceId: string, userId: string) {
    const membership = await this.database.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });

    if (!membership) {
      throw new TaskServiceError("NOT_FOUND");
    }
  }

  private async requireAssignee(
    workspaceId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (assigneeId == null) {
      return;
    }

    const membership = await this.database.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: assigneeId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      throw new TaskServiceError("ASSIGNEE_NOT_MEMBER");
    }
  }

  private async requireTask(projectId: string, taskId: string) {
    const task = await this.database.task.findFirst({
      where: { id: taskId, projectId },
      select: taskSelect,
    });

    if (!task) {
      throw new TaskServiceError("NOT_FOUND");
    }

    return task;
  }

  async listTasks(
    workspaceId: string,
    projectId: string,
    userId: string,
    query: TaskListQuery,
  ) {
    await this.requireMembership(workspaceId, userId);
    await this.requireProject(workspaceId, projectId);

    if (query.assigneeId !== undefined && query.assigneeId !== "unassigned") {
      await this.requireAssignee(workspaceId, query.assigneeId);
    }

    const where: Prisma.TaskWhereInput = { projectId };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.priority !== undefined) {
      where.priority = query.priority;
    }
    if (query.assigneeId === "unassigned") {
      where.assigneeId = null;
    } else if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }

    const sortFields = {
      createdAt: { createdAt: query.sortOrder },
      updatedAt: { updatedAt: query.sortOrder },
      dueDate: { dueDate: query.sortOrder },
      title: { title: query.sortOrder },
      priority: { priority: query.sortOrder },
      status: { status: query.sortOrder },
    } satisfies Record<
      Exclude<TaskListQuery["sortBy"], "id">,
      Prisma.TaskOrderByWithRelationInput
    >;
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      query.sortBy === "id"
        ? [{ id: query.sortOrder }]
        : [sortFields[query.sortBy], { id: query.sortOrder }];
    const skip = (query.page - 1) * query.limit;

    const [tasks, total] = await Promise.all([
      this.database.task.findMany({
        where,
        select: taskSelect,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.database.task.count({ where }),
    ]);

    return {
      tasks,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    await this.requireMembership(workspaceId, userId);
    await this.requireProject(workspaceId, projectId);
    const task = await this.requireTask(projectId, taskId);
    return { task };
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ) {
    await this.requireMembership(workspaceId, userId);
    await this.requireActiveProject(workspaceId, projectId);
    await this.requireAssignee(workspaceId, input.assigneeId);

    return this.database.$transaction(async (transaction) => {
      const task = await transaction.task.create({
        data: {
          projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate,
        },
        select: taskSelect,
      });

      await recordActivities(transaction, userId, [
        {
          workspaceId,
          eventType: "TASK_CREATED",
          resourceType: "TASK",
          resourceId: task.id,
          details: {
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        },
      ]);

      return { task };
    });
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ) {
    await this.requireMembership(workspaceId, userId);
    await this.requireActiveProject(workspaceId, projectId);

    const currentTask = await this.requireTask(projectId, taskId);
    if (
      input.status !== undefined &&
      input.status !== currentTask.status &&
      !allowedStatusTransitions[currentTask.status].includes(input.status)
    ) {
      throw new TaskServiceError("INVALID_STATUS_TRANSITION");
    }

    await this.requireAssignee(workspaceId, input.assigneeId);

    return this.database.$transaction(async (transaction) => {
      const task = await transaction.task.update({
        where: { id: taskId },
        data: input,
        select: taskSelect,
      });
      const activities = [];

      if (currentTask.status !== task.status) {
        activities.push({
          workspaceId,
          eventType:
            task.status === "DONE"
              ? ("TASK_COMPLETED" as const)
              : ("TASK_STATUS_CHANGED" as const),
          resourceType: "TASK" as const,
          resourceId: task.id,
          details: { from: currentTask.status, to: task.status },
        });
      }

      if (currentTask.assigneeId !== task.assigneeId) {
        activities.push({
          workspaceId,
          eventType: task.assigneeId
            ? ("TASK_ASSIGNED" as const)
            : ("TASK_UNASSIGNED" as const),
          resourceType: "TASK" as const,
          resourceId: task.id,
          details: {
            fromAssigneeId: currentTask.assigneeId,
            toAssigneeId: task.assigneeId,
          },
        });
      }

      if (currentTask.priority !== task.priority) {
        activities.push({
          workspaceId,
          eventType: "TASK_PRIORITY_CHANGED" as const,
          resourceType: "TASK" as const,
          resourceId: task.id,
          details: { from: currentTask.priority, to: task.priority },
        });
      }

      const changes: Record<
        string,
        { from: string | null; to: string | null }
      > = {};
      if (currentTask.title !== task.title) {
        changes.title = { from: currentTask.title, to: task.title };
      }
      if (currentTask.description !== task.description) {
        changes.description = {
          from: currentTask.description,
          to: task.description,
        };
      }
      if (currentTask.dueDate?.getTime() !== task.dueDate?.getTime()) {
        changes.dueDate = {
          from: currentTask.dueDate?.toISOString() ?? null,
          to: task.dueDate?.toISOString() ?? null,
        };
      }
      if (Object.keys(changes).length > 0) {
        activities.push({
          workspaceId,
          eventType: "TASK_UPDATED" as const,
          resourceType: "TASK" as const,
          resourceId: task.id,
          details: { changes },
        });
      }

      await recordActivities(transaction, userId, activities);

      return { task };
    });
  }
}

export function createTaskService(database: PrismaClient): TaskService {
  return new TaskService(database);
}

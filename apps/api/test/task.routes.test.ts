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
      findFirst: vi.fn(),
    },
    task: {
      create: vi.fn(),
      count: vi.fn(),
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
import { createTaskController } from "../src/modules/tasks/task.controller.js";
import { createTaskRouter } from "../src/modules/tasks/task.routes.js";
import { createTaskService } from "../src/modules/tasks/task.service.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const taskId = "00000000-0000-4000-8000-000000000003";
const userId = "00000000-0000-4000-8000-000000000004";
const task = {
  id: taskId,
  projectId,
  title: "Add task support",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  assigneeId: null,
  dueDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  assignee: null,
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
app.use(express.json());
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks",
  createTaskRouter(
    createTaskController(createTaskService(prisma)),
    requireTestUser,
  ),
);
app.use(createExceptionFilter(createLogger("silent")));

const route = `/api/workspaces/${workspaceId}/projects/${projectId}/tasks`;
const findMembership = vi.mocked(prisma.workspaceMembership.findUnique);
const findProject = vi.mocked(prisma.project.findFirst);
const findTask = vi.mocked(prisma.task.findFirst);
const listTasks = vi.mocked(prisma.task.findMany);
const countTasks = vi.mocked(prisma.task.count);
const createTask = vi.mocked(prisma.task.create);
const updateTask = vi.mocked(prisma.task.update);

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

describe("task routes", () => {
  it("requires authentication before listing tasks", async () => {
    const response = await request(app).get(route);

    expect(response.status).toBe(401);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("lists tasks after checking workspace access", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    listTasks.mockResolvedValue([task] as never);
    countTasks.mockResolvedValue(1);

    const response = await request(app)
      .get(route)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(response.body.data.tasks[0].title).toBe(task.title);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(listTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 20,
      }),
    );
  });

  it("filters and paginates tasks in the database with a validated sort", async () => {
    const assigneeId = "00000000-0000-4000-8000-000000000005";
    findMembership
      .mockResolvedValueOnce({ role: "MEMBER" } as never)
      .mockResolvedValueOnce({ userId: assigneeId } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    listTasks.mockResolvedValue([task] as never);
    countTasks.mockResolvedValue(43);

    const response = await request(app)
      .get(
        `${route}?status=IN_PROGRESS&priority=HIGH&assigneeId=${assigneeId}&page=3&limit=10&sortBy=title&sortOrder=asc`,
      )
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(listTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId,
          status: "IN_PROGRESS",
          priority: "HIGH",
          assigneeId,
        },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        skip: 20,
        take: 10,
      }),
    );
    expect(countTasks).toHaveBeenCalledWith({
      where: {
        projectId,
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeId,
      },
    });
    expect(response.body.data.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 43,
      totalPages: 5,
    });
  });

  it("filters tasks with no assignee", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    listTasks.mockResolvedValue([] as never);
    countTasks.mockResolvedValue(0);

    const response = await request(app)
      .get(`${route}?assigneeId=unassigned`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(200);
    expect(listTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId, assigneeId: null },
      }),
    );
    expect(response.body.data.pagination.totalPages).toBe(0);
  });

  it.each([
    "?page=0",
    "?limit=101",
    "?sortBy=hashedPassword",
    "?sortOrder=random",
    "?unknown=value",
  ])("rejects invalid task-list query %s", async (query) => {
    const response = await request(app)
      .get(`${route}${query}`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(findMembership).not.toHaveBeenCalled();
    expect(listTasks).not.toHaveBeenCalled();
  });

  it("does not reveal tasks to a non-member", async () => {
    findMembership.mockResolvedValue(null as never);

    const response = await request(app)
      .get(route)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(404);
    expect(findProject).not.toHaveBeenCalled();
    expect(listTasks).not.toHaveBeenCalled();
  });

  it("creates a task in the active project and normalizes its title", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    createTask.mockResolvedValue(task as never);

    const response = await request(app)
      .post(route)
      .set("x-test-user-id", userId)
      .send({ title: "  Add task support  " });

    expect(response.status).toBe(201);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId,
          title: "Add task support",
          description: undefined,
          priority: undefined,
          assigneeId: undefined,
          dueDate: undefined,
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
          eventType: "TASK_CREATED",
          resourceType: "TASK",
          resourceId: taskId,
          details: {
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        }),
      ],
    });
  });

  it("accepts a workspace member as assignee and parses a due date", async () => {
    const assigneeId = "00000000-0000-4000-8000-000000000005";
    const dueDate = "2026-11-15T12:00:00.000Z";
    findMembership
      .mockResolvedValueOnce({ role: "MEMBER" } as never)
      .mockResolvedValueOnce({ userId: assigneeId } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    createTask.mockResolvedValue({
      ...task,
      priority: "HIGH",
      assigneeId,
      dueDate: new Date(dueDate),
    } as never);

    const response = await request(app)
      .post(route)
      .set("x-test-user-id", userId)
      .send({
        title: "Assigned task",
        priority: "HIGH",
        assigneeId,
        dueDate,
      });

    expect(response.status).toBe(201);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigneeId,
          dueDate: new Date(dueDate),
          priority: "HIGH",
        }),
      }),
    );
  });

  it("rejects invalid task input before making database calls", async () => {
    const response = await request(app)
      .post(route)
      .set("x-test-user-id", userId)
      .send({ title: " " });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(findMembership).not.toHaveBeenCalled();
  });

  it("does not allow assigning a task to someone outside the workspace", async () => {
    const assigneeId = "00000000-0000-4000-8000-000000000005";
    findMembership
      .mockResolvedValueOnce({ role: "MEMBER" } as never)
      .mockResolvedValueOnce(null as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);

    const response = await request(app)
      .post(route)
      .set("x-test-user-id", userId)
      .send({ title: "Assigned task", assigneeId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("ASSIGNEE_NOT_MEMBER");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("prevents task creation in an archived project", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({
      id: projectId,
      archivedAt: new Date(),
    } as never);

    const response = await request(app)
      .post(route)
      .set("x-test-user-id", userId)
      .send({ title: "Archived project task" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PROJECT_ARCHIVED");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("does not return a task belonging to another project", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    findTask.mockResolvedValue(null);

    const response = await request(app)
      .get(`${route}/${taskId}`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(404);
    expect(findTask).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: taskId, projectId } }),
    );
  });

  it("does not expose a task when its project is outside the URL workspace", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue(null);

    const response = await request(app)
      .get(`${route}/${taskId}`)
      .set("x-test-user-id", userId);

    expect(response.status).toBe(404);
    expect(findTask).not.toHaveBeenCalled();
  });

  it("allows completed tasks to be reopened to TODO", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    findTask.mockResolvedValue({ ...task, status: "DONE" } as never);
    updateTask.mockResolvedValue({ ...task, status: "TODO" } as never);

    const response = await request(app)
      .patch(`${route}/${taskId}`)
      .set("x-test-user-id", userId)
      .send({ status: "TODO" });

    expect(response.status).toBe(200);
    expect(response.body.data.task.status).toBe("TODO");
    expect(updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "TODO" } }),
    );
  });

  it("allows moving a task from IN_PROGRESS to DONE", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    findTask.mockResolvedValue({ ...task, status: "IN_PROGRESS" } as never);
    updateTask.mockResolvedValue({ ...task, status: "DONE" } as never);

    const response = await request(app)
      .patch(`${route}/${taskId}`)
      .set("x-test-user-id", userId)
      .send({ status: "DONE" });

    expect(response.status).toBe(200);
    expect(response.body.data.task.status).toBe("DONE");
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: "TASK_COMPLETED",
          resourceId: taskId,
          details: { from: "IN_PROGRESS", to: "DONE" },
        }),
      ],
    });
  });

  it("records status, assignment, priority, and detail changes", async () => {
    const assigneeId = "00000000-0000-4000-8000-000000000005";
    findMembership
      .mockResolvedValueOnce({ role: "MEMBER" } as never)
      .mockResolvedValueOnce({ userId: assigneeId } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    findTask.mockResolvedValue(task as never);
    updateTask.mockResolvedValue({
      ...task,
      title: "Updated task",
      description: "A new description",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId,
    } as never);

    const response = await request(app)
      .patch(`${route}/${taskId}`)
      .set("x-test-user-id", userId)
      .send({
        title: "Updated task",
        description: "A new description",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeId,
      });

    expect(response.status).toBe(200);
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ eventType: "TASK_STATUS_CHANGED" }),
        expect.objectContaining({ eventType: "TASK_ASSIGNED" }),
        expect.objectContaining({ eventType: "TASK_PRIORITY_CHANGED" }),
        expect.objectContaining({ eventType: "TASK_UPDATED" }),
      ]),
    });
  });

  it("rejects skipping directly from TODO to DONE", async () => {
    findMembership.mockResolvedValue({ role: "MEMBER" } as never);
    findProject.mockResolvedValue({ id: projectId, archivedAt: null } as never);
    findTask.mockResolvedValue(task as never);

    const response = await request(app)
      .patch(`${route}/${taskId}`)
      .set("x-test-user-id", userId)
      .send({ status: "DONE" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(updateTask).not.toHaveBeenCalled();
  });
});

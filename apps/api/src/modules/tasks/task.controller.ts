import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { runWithErrorMap } from "../../http/service-error.js";
import { sendSuccess } from "../../http/response.js";
import { parseRequest } from "../../http/validation.js";
import { requireAuthenticatedUser } from "../auth/auth.guard.js";
import { taskErrors } from "./task.errors.js";
import {
  createTaskSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./task.schemas.js";
import type { TaskService } from "./task.service.js";

function parseRouteId(value: unknown, label: string): string {
  return parseRequest(
    z.string().uuid(`Invalid ${label} ID.`),
    value,
    `Invalid ${label} ID.`,
  );
}

export class TaskController {
  constructor(private readonly service: TaskService) {}

  list: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRouteId(request.params.workspaceId, "workspace");
    const projectId = parseRouteId(request.params.projectId, "project");
    const query = parseRequest(
      taskListQuerySchema,
      request.query,
      "Task query parameters are invalid.",
    );
    const result = await runWithErrorMap(taskErrors, () =>
      this.service.listTasks(workspaceId, projectId, user.id, query),
    );
    sendSuccess(response, 200, result);
  };

  get: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const { workspaceId, projectId, taskId } = this.parseRoute(request);
    const result = await runWithErrorMap(taskErrors, () =>
      this.service.getTask(workspaceId, projectId, taskId, user.id),
    );
    sendSuccess(response, 200, result);
  };

  create: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRouteId(request.params.workspaceId, "workspace");
    const projectId = parseRouteId(request.params.projectId, "project");
    const input = parseRequest(
      createTaskSchema,
      request.body,
      "Task validation failed.",
    );
    const result = await runWithErrorMap(taskErrors, () =>
      this.service.createTask(workspaceId, projectId, user.id, input),
    );
    sendSuccess(response, 201, result);
  };

  update: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const { workspaceId, projectId, taskId } = this.parseRoute(request);
    const input = parseRequest(
      updateTaskSchema,
      request.body,
      "Task validation failed.",
    );
    const result = await runWithErrorMap(taskErrors, () =>
      this.service.updateTask(workspaceId, projectId, taskId, user.id, input),
    );
    sendSuccess(response, 200, result);
  };

  private parseRoute(request: Request) {
    return {
      workspaceId: parseRouteId(request.params.workspaceId, "workspace"),
      projectId: parseRouteId(request.params.projectId, "project"),
      taskId: parseRouteId(request.params.taskId, "task"),
    };
  }
}

export function createTaskController(service: TaskService): TaskController {
  return new TaskController(service);
}

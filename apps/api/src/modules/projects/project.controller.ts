import type { Request, RequestHandler } from "express";
import { runWithErrorMap } from "../../http/service-error.js";
import { sendSuccess } from "../../http/response.js";
import { parseRequest } from "../../http/validation.js";
import { requireAuthenticatedUser } from "../auth/auth.guard.js";
import { projectErrors } from "./project.errors.js";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from "./project.schemas.js";
import type { ProjectService } from "./project.service.js";
import { workspaceIdSchema } from "../workspaces/workspace.schemas.js";

function parseWorkspaceId(request: Request): string {
  return parseRequest(
    workspaceIdSchema,
    request.params.workspaceId,
    "Invalid workspace ID.",
  );
}

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseWorkspaceId(request);
    const result = await runWithErrorMap(projectErrors, () =>
      this.service.listProjects(workspaceId, user.id),
    );
    sendSuccess(response, 200, result);
  };

  create: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseWorkspaceId(request);
    const input = parseRequest(
      createProjectSchema,
      request.body,
      "Project validation failed.",
    );
    const result = await runWithErrorMap(projectErrors, () =>
      this.service.createProject(workspaceId, user.id, input),
    );
    sendSuccess(response, 201, result);
  };

  get: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseWorkspaceId(request);
    const projectId = parseRequest(
      projectIdSchema,
      request.params.projectId,
      "Invalid project ID.",
    );
    const result = await runWithErrorMap(projectErrors, () =>
      this.service.getProject(workspaceId, user.id, projectId),
    );
    sendSuccess(response, 200, result);
  };

  update: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseWorkspaceId(request);
    const projectId = parseRequest(
      projectIdSchema,
      request.params.projectId,
      "Invalid project ID.",
    );
    const input = parseRequest(
      updateProjectSchema,
      request.body,
      "Project validation failed.",
    );
    const result = await runWithErrorMap(projectErrors, () =>
      this.service.updateProject(workspaceId, user.id, projectId, input),
    );
    sendSuccess(response, 200, result);
  };

  archive: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseWorkspaceId(request);
    const projectId = parseRequest(
      projectIdSchema,
      request.params.projectId,
      "Invalid project ID.",
    );
    const result = await runWithErrorMap(projectErrors, () =>
      this.service.archiveProject(workspaceId, user.id, projectId),
    );
    sendSuccess(response, 200, result);
  };
}

export function createProjectController(
  service: ProjectService,
): ProjectController {
  return new ProjectController(service);
}

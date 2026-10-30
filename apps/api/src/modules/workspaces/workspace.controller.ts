import type { RequestHandler } from "express";
import { sendSuccess } from "../../http/response.js";
import { parseRequest } from "../../http/validation.js";
import { runWithErrorMap } from "../../http/service-error.js";
import { requireAuthenticatedUser } from "../auth/auth.guard.js";
import { workspaceErrors } from "./workspace.errors.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  membershipIdSchema,
} from "./workspace.schemas.js";
import type { WorkspaceService } from "./workspace.service.js";

export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {
  }

  /** POST / */
  create: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const input = parseRequest(
      createWorkspaceSchema,
      request.body,
      "Workspace validation failed.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.createWorkspace(user.id, input.name),
    );
    sendSuccess(response, 201, data);
  };

  /** GET / */
  list: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaces = await runWithErrorMap(workspaceErrors, () =>
      this.service.listUserWorkspaces(user.id),
    );
    sendSuccess(response, 200, { workspaces });
  };

  /** GET /:workspaceId */
  get: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.getUserWorkspace(workspaceId, user.id),
    );
    sendSuccess(response, 200, data);
  };

  /** PATCH /:workspaceId */
  update: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const input = parseRequest(
      updateWorkspaceSchema,
      request.body,
      "Workspace validation failed.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.updateWorkspace(workspaceId, user.id, input.name),
    );
    sendSuccess(response, 200, data);
  };

  /** DELETE /:workspaceId */
  delete: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    await runWithErrorMap(workspaceErrors, () =>
      this.service.deleteWorkspace(workspaceId, user.id),
    );
    response.status(204).send();
  };

  /** GET /:workspaceId/members */
  listMembers: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.listWorkspaceMembers(workspaceId, user.id),
    );
    sendSuccess(response, 200, data);
  };

  /** POST /:workspaceId/members */
  addMember: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const input = parseRequest(
      addMemberSchema,
      request.body,
      "Member validation failed.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.addWorkspaceMember(workspaceId, user.id, input),
    );
    sendSuccess(response, 201, data);
  };

  /** PATCH /:workspaceId/members/:membershipId */
  updateMemberRole: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const membershipId = parseRequest(
      membershipIdSchema,
      request.params.membershipId,
      "Invalid membership ID.",
    );
    const input = parseRequest(
      updateMemberRoleSchema,
      request.body,
      "Role validation failed.",
    );
    const data = await runWithErrorMap(workspaceErrors, () =>
      this.service.updateMemberRole(
        workspaceId,
        user.id,
        membershipId,
        input.role,
      ),
    );
    sendSuccess(response, 200, data);
  };

  /** DELETE /:workspaceId/members/:membershipId */
  removeMember: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const membershipId = parseRequest(
      membershipIdSchema,
      request.params.membershipId,
      "Invalid membership ID.",
    );
    await runWithErrorMap(workspaceErrors, () =>
      this.service.removeWorkspaceMember(workspaceId, user.id, membershipId),
    );
    response.status(204).send();
  };
}

export function createWorkspaceController(
  service: WorkspaceService,
): WorkspaceController {
  return new WorkspaceController(service);
}

import type { RequestHandler } from "express";
import { runWithErrorMap } from "../../http/service-error.js";
import { sendSuccess } from "../../http/response.js";
import { parseRequest } from "../../http/validation.js";
import { requireAuthenticatedUser } from "../auth/auth.guard.js";
import { workspaceIdSchema } from "../workspaces/workspace.schemas.js";
import { activityErrors } from "./activity.errors.js";
import { activityListQuerySchema } from "./activity.schemas.js";
import type { ActivityService } from "./activity.service.js";

export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  list: RequestHandler = async (request, response) => {
    const user = requireAuthenticatedUser(request);
    const workspaceId = parseRequest(
      workspaceIdSchema,
      request.params.workspaceId,
      "Invalid workspace ID.",
    );
    const query = parseRequest(
      activityListQuerySchema,
      request.query,
      "Activity query parameters are invalid.",
    );
    const result = await runWithErrorMap(activityErrors, () =>
      this.service.listWorkspaceActivity(workspaceId, user.id, query),
    );
    sendSuccess(response, 200, result);
  };
}

export function createActivityController(
  service: ActivityService,
): ActivityController {
  return new ActivityController(service);
}

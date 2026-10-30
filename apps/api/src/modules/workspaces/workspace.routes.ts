import { Router, type RequestHandler } from "express";
import type { WorkspaceController } from "./workspace.controller.js";

/**
 * Creates the Express router for workspace routes.
 */
export function createWorkspaceRouter(
  controller: WorkspaceController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  // Workspace CRUD
  router.post("/", requireAuth, controller.create);
  router.get("/", requireAuth, controller.list);
  router.get("/:workspaceId", requireAuth, controller.get);
  router.patch("/:workspaceId", requireAuth, controller.update);
  router.delete("/:workspaceId", requireAuth, controller.delete);

  // Membership & Permissions
  router.get("/:workspaceId/members", requireAuth, controller.listMembers);
  router.post("/:workspaceId/members", requireAuth, controller.addMember);
  router.patch(
    "/:workspaceId/members/:membershipId",
    requireAuth,
    controller.updateMemberRole,
  );
  router.delete(
    "/:workspaceId/members/:membershipId",
    requireAuth,
    controller.removeMember,
  );

  return router;
}

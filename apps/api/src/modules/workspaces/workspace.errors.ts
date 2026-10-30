import { defineErrorMap } from "../../http/service-error.js";

/**
 * Maps every `WorkspaceServiceError` code to an HTTP [status, message] or [status, code, message] tuple.
 * Controllers apply this map when executing service operations.
 */
export const workspaceErrors = defineErrorMap({
  NOT_FOUND: [404, "Workspace or membership not found."],
  USER_NOT_FOUND: [404, "User with this email not found."],
  ALREADY_MEMBER: [409, "User is already a member of this workspace."],
  FORBIDDEN_UPDATE: [
    403,
    "FORBIDDEN",
    "Only workspace owners and admins can update the workspace.",
  ],
  FORBIDDEN_DELETE: [
    403,
    "FORBIDDEN",
    "Only the workspace owner can delete this workspace.",
  ],
  FORBIDDEN_ADD_MEMBER: [
    403,
    "FORBIDDEN",
    "Only workspace owners and admins can add members.",
  ],
  FORBIDDEN_ADD_ADMIN: [
    403,
    "FORBIDDEN",
    "Only the workspace owner can add an admin.",
  ],
  FORBIDDEN_ROLE_CHANGE: [
    403,
    "FORBIDDEN",
    "Only the workspace owner can change member roles.",
  ],
  FORBIDDEN_REMOVE_MEMBER: [
    403,
    "FORBIDDEN",
    "You do not have permission to remove this member.",
  ],
  CANNOT_REMOVE_OWNER: [
    400,
    "The workspace owner cannot leave or be removed without transferring ownership.",
  ],
  CANNOT_DEMOTE_OWNER: [
    400,
    "The workspace owner cannot be demoted directly. Transfer ownership instead.",
  ],
});

/** Union of valid workspace error codes. */
export type WorkspaceErrorCode = keyof typeof workspaceErrors;

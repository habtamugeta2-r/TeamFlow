import { defineErrorMap } from "../../http/service-error.js";

export const projectErrors = defineErrorMap({
  NOT_FOUND: [404, "Project not found in this workspace."],
  FORBIDDEN_UPDATE: [
    403,
    "FORBIDDEN",
    "Only workspace owners and admins can update project details.",
  ],
  FORBIDDEN_ARCHIVE: [
    403,
    "FORBIDDEN",
    "Only workspace owners and admins can archive projects.",
  ],
});

export type ProjectErrorCode = keyof typeof projectErrors;

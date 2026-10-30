import { defineErrorMap } from "../../http/service-error.js";

export const taskErrors = defineErrorMap({
  NOT_FOUND: [404, "Task not found in this project."],
  PROJECT_ARCHIVED: [409, "Tasks cannot be changed in an archived project."],
  ASSIGNEE_NOT_MEMBER: [
    400,
    "The assignee must be a current member of this workspace.",
  ],
  INVALID_STATUS_TRANSITION: [
    409,
    "The task cannot move directly between those statuses.",
  ],
});

export type TaskErrorCode = keyof typeof taskErrors;

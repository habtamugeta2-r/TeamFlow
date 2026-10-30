import { defineErrorMap } from "../../http/service-error.js";

export const activityErrors = defineErrorMap({
  NOT_FOUND: [404, "Workspace not found."],
});

export type ActivityErrorCode = keyof typeof activityErrors;

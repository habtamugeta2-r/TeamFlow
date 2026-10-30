import { z } from "zod";

export const activityListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    eventType: z
      .enum([
        "PROJECT_CREATED",
        "PROJECT_UPDATED",
        "PROJECT_ARCHIVED",
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_STATUS_CHANGED",
        "TASK_COMPLETED",
        "TASK_ASSIGNED",
        "TASK_UNASSIGNED",
        "TASK_PRIORITY_CHANGED",
      ])
      .optional(),
    resourceType: z.enum(["PROJECT", "TASK"]).optional(),
  })
  .strict();

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;

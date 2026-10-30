import { z } from "zod";

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Task title is required.")
  .max(200, "Task title cannot exceed 200 characters.");

const taskDescriptionSchema = z
  .string()
  .trim()
  .max(5000, "Task description cannot exceed 5000 characters.");

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const assigneeIdSchema = z.string().uuid("Invalid assignee ID.");
const assigneeFilterSchema = z.union([
  assigneeIdSchema,
  z.literal("unassigned"),
]);
const dueDateSchema = z.iso.datetime().transform((value) => new Date(value));

export const taskIdSchema = z.string().uuid("Invalid task ID.");

export const taskListQuerySchema = z
  .object({
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: assigneeFilterSchema.optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "dueDate",
        "title",
        "priority",
        "status",
        "id",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: assigneeIdSchema.nullable().optional(),
  dueDate: dueDateSchema.nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: assigneeIdSchema.nullable().optional(),
    dueDate: dueDateSchema.nullable().optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Provide at least one task field to update.",
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

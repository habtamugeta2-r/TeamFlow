import { z } from "zod";

const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Project name must contain at least 2 characters")
  .max(100, "Project name cannot exceed 100 characters");

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(5000, "Project description cannot exceed 5000 characters");

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.nullable().optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.description !== undefined,
    "Provide a project name or description to update.",
  );

export const projectIdSchema = z.string().uuid("Invalid project ID.");

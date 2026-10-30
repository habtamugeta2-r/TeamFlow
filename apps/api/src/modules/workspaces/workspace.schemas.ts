import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Workspace                                                                 *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must contain at least 2 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must contain at least 2 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceIdSchema = z.string().uuid("Invalid workspace ID.");

export type WorkspaceIdInput = z.infer<typeof workspaceIdSchema>;

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Membership                                                                *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER").optional(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"], {
    message: "Role must be OWNER, ADMIN, or MEMBER",
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const membershipIdSchema = z.string().uuid("Invalid membership ID.");

export type MembershipIdInput = z.infer<typeof membershipIdSchema>;

import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please provide a valid email address")
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(1024, "Password cannot exceed 1024 characters");

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Register                                                                  *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: emailSchema,

  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Login                                                                     *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const loginSchema = z.object({
  email: emailSchema,

  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

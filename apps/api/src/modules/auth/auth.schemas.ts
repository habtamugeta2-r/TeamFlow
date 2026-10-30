import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Register                                                                  *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .toLowerCase(),

  password: z.string().min(8, "Password must contain at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Login                                                                     *
 * ═══════════════════════════════════════════════════════════════════════════ */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .toLowerCase(),

  password: z.string().min(8, "Password must contain at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

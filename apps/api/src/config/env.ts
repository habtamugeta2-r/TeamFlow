import dotenv from "dotenv";
import { z } from "zod";

// Always resolve .env relative to this file, not the terminal's directory.
// This also works when the API is compiled into the dist directory.
dotenv.config({
  path: new URL("../../.env", import.meta.url),
});

const trustProxySchema = z
  .string()
  .optional()
  .transform((value, context) => {
    const normalized = value?.trim().toLowerCase();

    if (!normalized || normalized === "false") {
      return false;
    }

    if (normalized === "true") {
      return true;
    }

    if (/^\d+$/.test(normalized)) {
      const hops = Number(normalized);

      if (Number.isSafeInteger(hops)) {
        return hops;
      }
    }

    context.addIssue({
      code: "custom",
      message: "must be true, false, or a non-negative integer",
    });
    return z.NEVER;
  });

const environmentSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  API_HOST: z.string().trim().min(1).default("127.0.0.1"),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  TRUST_PROXY: trustProxySchema,

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().nonnegative().default(20),

  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("; ");

  throw new Error(`Invalid API environment: ${issues}`);
}

export const env = result.data;

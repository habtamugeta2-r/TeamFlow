import dotenv from "dotenv";
import { z } from "zod";

// Always resolve .env relative to this file, not the terminal's directory.
// This also works when the API is compiled into the dist directory.
dotenv.config({
  path: new URL("../../.env", import.meta.url),
});

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  API_HOST: z.string().trim().min(1).default("127.0.0.1"),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
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

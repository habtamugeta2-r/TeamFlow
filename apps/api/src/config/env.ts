import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
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

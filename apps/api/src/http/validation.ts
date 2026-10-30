import { z } from "zod";
import { HttpException } from "./exception.js";
import { validationDetails } from "./response.js";

export function parseRequest<T>(
  schema: z.ZodType<T>,
  input: unknown,
  message: string,
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new HttpException(
      400,
      "VALIDATION_ERROR",
      message,
      validationDetails(result.error.issues),
    );
  }

  return result.data;
}

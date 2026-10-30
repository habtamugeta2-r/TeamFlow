import { ApiError } from "./api";

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = error.details.map((item) => item.message).join(" ");
    return detail ? `${error.message} ${detail}` : error.message;
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

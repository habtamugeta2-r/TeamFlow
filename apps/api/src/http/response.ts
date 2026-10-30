import type { Response } from "express";

export type ApiErrorDetail = {
  field: string;
  message: string;
};

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

export function sendSuccess<T>(
  response: Response,
  status: number,
  data: T,
): Response {
  return response.status(status).json({ data });
}

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  details: ApiErrorDetail[] = [],
): Response {
  return response.status(status).json({
    error: { code, message, details },
  });
}

export function validationDetails(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ApiErrorDetail[] {
  return issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

import type { ApiErrorDetail } from "./response.js";

export class HttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "HttpException";
  }
}

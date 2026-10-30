import { HttpException } from "./exception.js";

export class ServiceError<TCode extends string = string> extends Error {
  constructor(public readonly code: TCode) {
    super(code);
    this.name = "ServiceError";
  }

  get reason(): TCode {
    return this.code;
  }
}

export type ErrorMapping =
  | readonly [status: number, message: string]
  | readonly [status: number, code: string, message: string];

export type ErrorMap = Record<string, ErrorMapping>;

export function defineErrorMap<
  const T extends Record<
    string,
    readonly [number, string] | readonly [number, string, string]
  >,
>(map: T): T {
  return map;
}

export async function runWithErrorMap<T>(
  errorMap: ErrorMap,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ServiceError && Object.hasOwn(errorMap, error.code)) {
      const mapping = errorMap[error.code]!;
      if (mapping.length === 3) {
        const [status, code, message] = mapping;
        throw new HttpException(status, code, message);
      } else {
        const [status, message] = mapping;
        throw new HttpException(status, error.code, message);
      }
    }
    throw error;
  }
}

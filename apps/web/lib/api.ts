export type ApiErrorDetail = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  data: T;
};

type ApiFailure = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const failure = payload as ApiFailure | undefined;
    throw new ApiError(
      failure?.error?.message ?? "The request could not be completed.",
      response.status,
      failure?.error?.code ?? "REQUEST_FAILED",
      failure?.error?.details ?? [],
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

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

type ApiEnvelope = {
  data: unknown;
};

type ApiFailure = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
};

function isApiFailure(payload: unknown): payload is ApiFailure {
  return typeof payload === "object" && payload !== null && "error" in payload;
}

function isApiEnvelope(payload: unknown): payload is ApiEnvelope {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new ApiError(
      "Unable to reach TeamFlow. Check that the API server is running, then try again.",
      0,
      "API_UNAVAILABLE",
      [],
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    if (response.status >= 500) {
      throw new ApiError(
        "Unable to reach TeamFlow. Check that the API server is running, then try again.",
        response.status,
        "API_UNAVAILABLE",
        [],
      );
    }

    throw new ApiError(
      "The server returned an invalid response. Please try again.",
      response.status,
      "INVALID_RESPONSE",
      [],
    );
  }

  if (!response.ok) {
    const failure = isApiFailure(payload) ? payload.error : undefined;
    throw new ApiError(
      failure?.message ?? "The request could not be completed.",
      response.status,
      failure?.code ?? "REQUEST_FAILED",
      failure?.details ?? [],
    );
  }

  if (!isApiEnvelope(payload)) {
    throw new ApiError(
      "The server returned an invalid response. Please try again.",
      response.status,
      "INVALID_RESPONSE",
      [],
    );
  }

  return payload.data as T;
}

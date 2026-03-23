const DEFAULT_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

interface ApiFetchInit extends RequestInit {
  withAuth?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function getApiAuthToken(): string | null {
  return authToken;
}

export function withAuthHeaders(headers?: HeadersInit): HeadersInit {
  if (!authToken) {
    return headers ?? {};
  }

  return {
    ...(headers ?? {}),
    Authorization: `Bearer ${authToken}`,
  };
}

export async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    const message = body.error?.message ?? `Request failed with status ${response.status}`;
    const code = body.error?.code ?? "UNKNOWN_ERROR";
    return new ApiError(message, response.status, code);
  } catch {
    return new ApiError(`Request failed with status ${response.status}`, response.status, "UNKNOWN_ERROR");
  }
}

/** @deprecated Use toApiError for structured error handling */
export async function toApiErrorMessage(response: Response): Promise<string> {
  const error = await toApiError(response);
  return error.message;
}

export async function apiFetchWithTimeout(
  input: RequestInfo | URL,
  init?: ApiFetchInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const {
    withAuth = true,
    headers,
    ...requestInit
  } = init ?? {};

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      headers: withAuth ? withAuthHeaders(headers) : (headers ?? {}),
      signal: abortController.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

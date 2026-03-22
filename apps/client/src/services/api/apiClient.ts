const DEFAULT_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
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

export async function toApiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (body.error?.message) {
      return body.error.message;
    }
  } catch {
    // Fallback to status-based message when response is not JSON.
  }

  return `Request failed with status ${response.status}`;
}

export async function apiFetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      headers: withAuthHeaders(init?.headers),
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

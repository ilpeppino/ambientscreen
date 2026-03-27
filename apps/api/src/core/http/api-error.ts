export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DUPLICATE_RESOURCE"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "INTEGRATION_NOT_FOUND"
  | "INTEGRATION_FORBIDDEN"
  | "INTEGRATION_PROVIDER_MISMATCH"
  | "INTEGRATION_NEEDS_REAUTH"
  | "INTEGRATION_REFRESH_FAILED"
  | "INTEGRATION_INVALID_STATE"
  | "INTEGRATION_OAUTH_EXCHANGE_FAILED"
  | "INTEGRATION_PROVIDER_ERROR";

interface ApiErrorOptions {
  code: ApiErrorCode;
  status: number;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export const apiErrors = {
  badRequest(message: string, details?: unknown) {
    return new ApiError({
      code: "BAD_REQUEST",
      status: 400,
      message,
      details
    });
  },

  validation(message: string, details?: unknown) {
    return new ApiError({
      code: "VALIDATION_ERROR",
      status: 400,
      message,
      details
    });
  },

  notFound(message: string, details?: unknown) {
    return new ApiError({
      code: "NOT_FOUND",
      status: 404,
      message,
      details
    });
  },

  duplicate(message: string, details?: unknown) {
    return new ApiError({
      code: "DUPLICATE_RESOURCE",
      status: 409,
      message,
      details
    });
  },

  unauthorized(message: string, details?: unknown) {
    return new ApiError({
      code: "UNAUTHORIZED",
      status: 401,
      message,
      details
    });
  },

  forbidden(message: string, details?: unknown) {
    return new ApiError({
      code: "FORBIDDEN",
      status: 403,
      message,
      details
    });
  },

  integrationNotFound(message: string) {
    return new ApiError({ code: "INTEGRATION_NOT_FOUND", status: 404, message });
  },

  integrationForbidden(message: string) {
    return new ApiError({ code: "INTEGRATION_FORBIDDEN", status: 403, message });
  },

  integrationProviderMismatch(message: string) {
    return new ApiError({ code: "INTEGRATION_PROVIDER_MISMATCH", status: 400, message });
  },

  integrationNeedsReauth(message: string) {
    return new ApiError({ code: "INTEGRATION_NEEDS_REAUTH", status: 409, message });
  },

  integrationRefreshFailed(message: string) {
    return new ApiError({ code: "INTEGRATION_REFRESH_FAILED", status: 502, message });
  },

  integrationInvalidState(message: string) {
    return new ApiError({ code: "INTEGRATION_INVALID_STATE", status: 400, message });
  },

  integrationOAuthExchangeFailed(message: string) {
    return new ApiError({ code: "INTEGRATION_OAUTH_EXCHANGE_FAILED", status: 502, message });
  },

  integrationProviderError(message: string) {
    return new ApiError({ code: "INTEGRATION_PROVIDER_ERROR", status: 502, message });
  },
};

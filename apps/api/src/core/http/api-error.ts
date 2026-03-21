export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "DUPLICATE_RESOURCE"
  | "INTERNAL_ERROR";

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
  }
};

import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./api-error";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function isPrismaErrorWithCode(
  error: unknown,
  code: string
): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    return new ApiError({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid request payload"
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new ApiError({
      code: "DUPLICATE_RESOURCE",
      status: 409,
      message: "A record with this unique value already exists"
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return new ApiError({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid relation reference in payload"
    });
  }

  if (isPrismaErrorWithCode(error, "P2002")) {
    return new ApiError({
      code: "DUPLICATE_RESOURCE",
      status: 409,
      message: "A record with this unique value already exists"
    });
  }

  if (isPrismaErrorWithCode(error, "P2003")) {
    return new ApiError({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid relation reference in payload"
    });
  }

  return new ApiError({
    code: "INTERNAL_ERROR",
    status: 500,
    message: "Internal server error"
  });
}

export function notFoundMiddleware(req: Request, res: Response) {
  const response: ErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  };

  res.status(404).json(response);
}

export function globalErrorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const apiError = toApiError(error);
  const response: ErrorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message
    }
  };

  if (apiError.details !== undefined) {
    response.error.details = apiError.details;
  }

  const logContext = `[API] ${req.method} ${req.originalUrl} -> ${apiError.status} ${apiError.code}`;

  if (apiError.status >= 500) {
    console.error(logContext, error);
  } else if (apiError.status === 401 || apiError.status === 403) {
    console.warn(`[SECURITY] ${logContext}`);
  } else {
    console.warn(logContext);
  }

  res.status(apiError.status).json(response);
}

import type { ErrorCode } from "@orbit/shared";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string[]>) =>
  new AppError(400, "VALIDATION_ERROR", message, fields);

export const unauthenticated = (message = "Authentication required") =>
  new AppError(401, "UNAUTHENTICATED", message);

export const tokenExpired = () => new AppError(401, "TOKEN_EXPIRED", "Session expired");

export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

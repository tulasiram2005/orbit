import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { fail } from "./envelope.js";
import { AppError } from "./errors.js";

function zodFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "body";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  void _next;
  const requestId = String(request.id);

  if (error instanceof AppError) {
    response.status(error.status).json(fail(error.code, error.message, requestId, error.fields));
    return;
  }

  if (error instanceof ZodError) {
    response
      .status(400)
      .json(fail("VALIDATION_ERROR", "Request is invalid", requestId, zodFields(error)));
    return;
  }

  request.log.error({ error }, "Unhandled request error");
  response.status(500).json(fail("INTERNAL", "Internal server error", requestId));
};

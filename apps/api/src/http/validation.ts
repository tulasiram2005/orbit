import type { RequestHandler } from "express";
import type { z } from "zod";

import { badRequest } from "./errors.js";

function flattenZodError(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "body";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}

export function validateBody<TSchema extends z.ZodType>(schema: TSchema): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(badRequest("Request body is invalid", flattenZodError(result.error)));
      return;
    }

    request.body = result.data;
    next();
  };
}

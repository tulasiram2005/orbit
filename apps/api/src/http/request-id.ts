import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

export const requestId: RequestHandler = (request, response, next) => {
  const header = request.header("x-request-id");
  const value = header && header.trim().length > 0 ? header.trim() : randomUUID();
  request.id = value;
  response.setHeader("x-request-id", value);
  next();
};

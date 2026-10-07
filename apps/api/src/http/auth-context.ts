import type { Response } from "express";

import { unauthenticated } from "./errors.js";

export function requireUserId(response: Response): string {
  const userId = response.locals.auth?.userId;

  if (!userId) {
    throw unauthenticated();
  }

  return userId;
}

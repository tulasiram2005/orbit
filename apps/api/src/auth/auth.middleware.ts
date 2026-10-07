import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import type { ApiEnv } from "../config/env.js";
import { tokenExpired, unauthenticated } from "../http/errors.js";
import { verifyAccessToken } from "./token.service.js";

function readBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return undefined;
  }

  return token;
}

export function requireAuth(env: ApiEnv): RequestHandler {
  return (request, response, next) => {
    const token = readBearerToken(request.header("authorization"));

    if (!token) {
      next(unauthenticated());
      return;
    }

    try {
      const payload = verifyAccessToken(token, env);
      response.locals.auth = { userId: payload.sub };
      next();
    } catch (error) {
      next(error instanceof jwt.TokenExpiredError ? tokenExpired() : unauthenticated());
    }
  };
}

import type { Request, Response } from "express";

import type { RefreshTokenBody } from "@orbit/shared";

import { ok } from "../http/envelope.js";
import { unauthenticated } from "../http/errors.js";
import type { AuthService } from "./auth.service.js";

const refreshCookie = "orbit_refresh_token";

function setRefreshCookie(response: Response, token: string) {
  response.cookie(refreshCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: response.req.secure,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: response.req.secure,
    path: "/api/auth",
  });
}

function readRefreshToken(request: Request): string | undefined {
  const body = request.body as Partial<RefreshTokenBody>;
  const cookieValue = request.cookies?.[refreshCookie];

  if (typeof body.refreshToken === "string") {
    return body.refreshToken;
  }

  return typeof cookieValue === "string" ? cookieValue : undefined;
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (request: Request, response: Response) => {
    const session = await this.authService.register(request.body);
    setRefreshCookie(response, session.tokens.refreshToken);
    response.status(201).json(ok(session));
  };

  login = async (request: Request, response: Response) => {
    const session = await this.authService.login(request.body);
    setRefreshCookie(response, session.tokens.refreshToken);
    response.json(ok(session));
  };

  refresh = async (request: Request, response: Response) => {
    const token = readRefreshToken(request);

    if (!token) {
      throw unauthenticated("Refresh token is required");
    }

    const session = await this.authService.refresh(token);
    setRefreshCookie(response, session.tokens.refreshToken);
    response.json(ok(session));
  };

  logout = async (request: Request, response: Response) => {
    await this.authService.logout(readRefreshToken(request));
    clearRefreshCookie(response);
    response.json(ok({ loggedOut: true }));
  };

  me = async (_request: Request, response: Response) => {
    const userId = response.locals.auth?.userId;

    if (!userId) {
      throw unauthenticated();
    }

    response.json(ok(await this.authService.me(userId)));
  };
}

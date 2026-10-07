import { randomBytes, randomUUID, createHash } from "node:crypto";

import jwt from "jsonwebtoken";

import type { ApiEnv } from "../config/env.js";
import type { AccessTokenPayload, TokenPair } from "./auth.types.js";

const accessTokenSeconds = 15 * 60;
const refreshTokenDays = 30;

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
}

export function signAccessToken(userId: string, env: ApiEnv): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    type: "access",
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: accessTokenSeconds,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string, env: ApiEnv): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    decoded.type !== "access" ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("Invalid access token");
  }

  return {
    sub: decoded.sub,
    type: "access",
  };
}

export function createTokenPair(userId: string, env: ApiEnv, refreshToken: string): TokenPair {
  return {
    accessToken: signAccessToken(userId, env),
    refreshToken,
    expiresInSeconds: accessTokenSeconds,
  };
}

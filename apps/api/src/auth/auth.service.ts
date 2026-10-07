import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { LoginInput, RegisterInput } from "@orbit/shared";

import type { ApiEnv } from "../config/env.js";
import { conflict, tokenExpired, unauthenticated } from "../http/errors.js";
import { toUserDto } from "../users/user.mapper.js";
import type { AuthSession } from "./auth.types.js";
import type { AuthRepository } from "./auth.repository.js";
import {
  createRefreshToken,
  createTokenPair,
  hashRefreshToken,
  refreshExpiry,
} from "./token.service.js";

const passwordCost = 12;

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly env: ApiEnv
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const passwordHash = await bcrypt.hash(input.password, passwordCost);

    try {
      const user = await this.repository.createUser({
        email: input.email,
        name: input.name,
        passwordHash,
      });

      const tokens = await this.createSessionTokens(user.id);

      return {
        user: toUserDto(user),
        tokens,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("Email is already registered");
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user) {
      throw unauthenticated("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw unauthenticated("Invalid credentials");
    }

    const tokens = await this.createSessionTokens(user.id);

    return {
      user: toUserDto(user),
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.repository.findRefreshToken(tokenHash);

    if (!storedToken) {
      throw unauthenticated("Invalid refresh token");
    }

    if (storedToken.revokedAt) {
      await this.repository.revokeRefreshTokenFamily(storedToken.familyId);
      throw unauthenticated("Invalid refresh token");
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.repository.revokeRefreshToken(storedToken.id);
      throw tokenExpired();
    }

    const user = await this.repository.findUserById(storedToken.userId);

    if (!user) {
      throw unauthenticated("Invalid refresh token");
    }

    await this.repository.revokeRefreshToken(storedToken.id);
    const nextToken = createRefreshToken();
    await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(nextToken),
      familyId: storedToken.familyId,
      expiresAt: refreshExpiry(),
    });

    return {
      user: toUserDto(user),
      tokens: createTokenPair(user.id, this.env, nextToken),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const storedToken = await this.repository.findRefreshToken(hashRefreshToken(refreshToken));

    if (!storedToken || storedToken.revokedAt) {
      return;
    }

    await this.repository.revokeRefreshToken(storedToken.id);
  }

  async me(userId: string) {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw unauthenticated();
    }

    return toUserDto(user);
  }

  private async createSessionTokens(userId: string) {
    const refreshToken = createRefreshToken();
    await this.repository.createRefreshToken({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      familyId: randomUUID(),
      expiresAt: refreshExpiry(),
    });

    return createTokenPair(userId, this.env, refreshToken);
  }
}

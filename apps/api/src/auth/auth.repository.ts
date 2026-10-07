import type { PrismaClient, RefreshToken, User } from "@prisma/client";

export type CreateUserData = {
  email: string;
  name: string;
  passwordHash: string;
};

export type CreateRefreshTokenData = {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
};

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserById(userId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id: userId } });
  }

  createUser(data: CreateUserData): Promise<User> {
    return this.db.user.create({ data });
  }

  createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.db.refreshToken.create({ data });
  }

  findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeRefreshTokenFamily(familyId: string): Promise<{ count: number }> {
    return this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

import type { AuthSessionDto, UserDto } from "@orbit/shared";

export type AuthContext = {
  userId: string;
};

export type TokenPair = AuthSessionDto["tokens"];

export type AuthSession = {
  user: UserDto;
  tokens: TokenPair;
};

export type AccessTokenPayload = {
  sub: string;
  type: "access";
};

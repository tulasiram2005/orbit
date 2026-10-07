import type { User } from "@prisma/client";
import type { UserDto } from "@orbit/shared";

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

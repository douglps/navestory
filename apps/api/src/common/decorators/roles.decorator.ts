import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * @spec SPEC-20260521-004 RF-09
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

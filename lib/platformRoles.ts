/** Canonical platform user roles and legacy name normalization. */

export const CANONICAL_PLATFORM_ROLES = [
  'platform_admin',
  'consultant_manager',
  'consultant',
  'contributor',
  'customer',
  'auditor',
] as const;

export type CanonicalPlatformRole = (typeof CANONICAL_PLATFORM_ROLES)[number];

/** Legacy platform roles renamed in a prior product iteration. */
export const LEGACY_PLATFORM_ROLE_MAP: Record<string, CanonicalPlatformRole> = {
  admin: 'platform_admin',
  viewer: 'contributor',
  read_only: 'customer',
};

export function isLegacyPlatformRole(
  role: string | undefined,
): role is keyof typeof LEGACY_PLATFORM_ROLE_MAP {
  if (!role) return false;
  return role in LEGACY_PLATFORM_ROLE_MAP;
}

export function normalizePlatformRole(
  role: string | undefined,
): CanonicalPlatformRole | undefined {
  if (!role) return undefined;
  if (isLegacyPlatformRole(role)) return LEGACY_PLATFORM_ROLE_MAP[role];
  if ((CANONICAL_PLATFORM_ROLES as readonly string[]).includes(role)) {
    return role as CanonicalPlatformRole;
  }
  return undefined;
}

export function hasLegacyPlatformRoleInUsers(
  users: Array<{ role?: string } | null | undefined>,
): boolean {
  return users.some((u) => u && isLegacyPlatformRole(u.role));
}

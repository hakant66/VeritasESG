import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PLATFORM_ROLES,
  LEGACY_PLATFORM_ROLE_MAP,
  isLegacyPlatformRole,
  normalizePlatformRole,
  hasLegacyPlatformRoleInUsers,
} from '../../lib/platformRoles.ts';
describe('normalizePlatformRole', () => {
  it('returns each canonical role unchanged', () => {
    for (const role of CANONICAL_PLATFORM_ROLES) {
      expect(normalizePlatformRole(role)).toBe(role);
    }
  });

  it('maps legacy admin -> platform_admin', () => {
    expect(normalizePlatformRole('admin')).toBe('platform_admin');
  });

  it('maps legacy viewer -> contributor', () => {
    expect(normalizePlatformRole('viewer')).toBe('contributor');
  });

  it('maps legacy read_only -> customer', () => {
    expect(normalizePlatformRole('read_only')).toBe('customer');
  });

  it('returns undefined for an unknown role', () => {
    expect(normalizePlatformRole('superuser')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(normalizePlatformRole('')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(normalizePlatformRole(undefined)).toBeUndefined();
  });
});

describe('isLegacyPlatformRole', () => {
  it('returns true for each legacy key', () => {
    for (const key of Object.keys(LEGACY_PLATFORM_ROLE_MAP)) {
      expect(isLegacyPlatformRole(key)).toBe(true);
    }
  });

  it('returns false for canonical roles', () => {
    for (const role of CANONICAL_PLATFORM_ROLES) {
      expect(isLegacyPlatformRole(role)).toBe(false);
    }
  });

  it('returns false for an unknown role', () => {
    expect(isLegacyPlatformRole('superuser')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLegacyPlatformRole(undefined)).toBe(false);
  });
});

describe('hasLegacyPlatformRoleInUsers', () => {
  it('detects a legacy role in a mixed array', () => {
    const users = [
      { role: 'platform_admin' },
      { role: 'viewer' },
      { role: 'customer' },
    ];
    expect(hasLegacyPlatformRoleInUsers(users)).toBe(true);
  });

  it('returns false when all roles are canonical', () => {
    const users = [
      { role: 'platform_admin' },
      { role: 'consultant' },
      { role: 'customer' },
    ];
    expect(hasLegacyPlatformRoleInUsers(users)).toBe(false);
  });

  it('tolerates null and undefined entries', () => {
    const users = [null, undefined, { role: 'consultant' }];
    expect(hasLegacyPlatformRoleInUsers(users)).toBe(false);
  });

  it('detects a legacy role alongside null entries', () => {
    const users = [null, { role: 'admin' }, undefined];
    expect(hasLegacyPlatformRoleInUsers(users)).toBe(true);
  });
});

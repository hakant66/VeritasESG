import { describe, it, expect } from 'vitest';
import {
  isAuditorPlatformUser,
  isAuditorProjectRole,
  isTasksOnlyPlatformUser,
  isCustomerPortalPlatformUser,
  isElevatedProjectMemberRole,
  hasElevatedProjectMembership,
  isCustomerParticipantOnlyUser,
  isTasksAndProfileOnlyUser,
  isProjectContributorRole,
  isTasksPageFilterAdmin,
  isAssignmentOtpPlatformUser,
  projectMemberRoleForSelect,
  isPlatformAdminRole,
  canListAllProjects,
  platformUserVisibleForProject,
  platformUserCustomerIdMismatchForProject,
} from '../../src/lib/userRoles.ts';

describe('isAuditorPlatformUser', () => {
  it('is true for auditor', () => {
    expect(isAuditorPlatformUser('auditor')).toBe(true);
  });

  it.each(['platform_admin', 'consultant_manager', 'consultant', 'contributor', 'customer'])(
    'is false for %s',
    (role) => {
      expect(isAuditorPlatformUser(role)).toBe(false);
    },
  );

  it('is false for undefined', () => {
    expect(isAuditorPlatformUser(undefined)).toBe(false);
  });
});

describe('isAuditorProjectRole', () => {
  it('is true for auditor', () => {
    expect(isAuditorProjectRole('auditor')).toBe(true);
  });

  it('is false for editor', () => {
    expect(isAuditorProjectRole('editor')).toBe(false);
  });
});

describe('isTasksOnlyPlatformUser', () => {
  it('is true for contributor', () => {
    expect(isTasksOnlyPlatformUser('contributor')).toBe(true);
  });

  it('is true for legacy viewer (normalized to contributor)', () => {
    expect(isTasksOnlyPlatformUser('viewer')).toBe(true);
  });

  it('is false for customer', () => {
    expect(isTasksOnlyPlatformUser('customer')).toBe(false);
  });
});

describe('isCustomerPortalPlatformUser', () => {
  it('is true for customer', () => {
    expect(isCustomerPortalPlatformUser('customer')).toBe(true);
  });

  it('is true for legacy read_only (normalized to customer)', () => {
    expect(isCustomerPortalPlatformUser('read_only')).toBe(true);
  });

  it('is false for contributor', () => {
    expect(isCustomerPortalPlatformUser('contributor')).toBe(false);
  });
});

describe('isElevatedProjectMemberRole', () => {
  it.each(['admin', 'editor'])('is true for %s', (role) => {
    expect(isElevatedProjectMemberRole(role)).toBe(true);
  });

  it.each(['viewer', 'contributor', 'auditor', undefined])(
    'is false for %s',
    (role) => {
      expect(isElevatedProjectMemberRole(role)).toBe(false);
    },
  );
});

describe('hasElevatedProjectMembership', () => {
  it('is true when an assignment has an elevated role', () => {
    expect(
      hasElevatedProjectMembership([{ role: 'contributor' }, { role: 'admin' }]),
    ).toBe(true);
  });

  it('is false when no assignment is elevated', () => {
    expect(
      hasElevatedProjectMembership([{ role: 'contributor' }, { role: 'auditor' }]),
    ).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(hasElevatedProjectMembership([])).toBe(false);
  });

  it('tolerates null/undefined', () => {
    expect(hasElevatedProjectMembership(null)).toBe(false);
    expect(hasElevatedProjectMembership(undefined)).toBe(false);
  });
});

describe('isCustomerParticipantOnlyUser', () => {
  it('is true for a customer with no elevated project role', () => {
    expect(isCustomerParticipantOnlyUser('customer', [{ role: 'contributor' }])).toBe(
      true,
    );
  });

  it('is true for a customer with no assignments', () => {
    expect(isCustomerParticipantOnlyUser('customer', [])).toBe(true);
  });

  it('is false for a customer who is admin on a project', () => {
    expect(isCustomerParticipantOnlyUser('customer', [{ role: 'admin' }])).toBe(
      false,
    );
  });

  it('is false for a non-customer role', () => {
    expect(isCustomerParticipantOnlyUser('consultant', [])).toBe(false);
  });

  it('is true for legacy read_only without elevated membership', () => {
    expect(isCustomerParticipantOnlyUser('read_only', [])).toBe(true);
  });
});

describe('isTasksAndProfileOnlyUser', () => {
  it('is true for contributor', () => {
    expect(isTasksAndProfileOnlyUser('contributor')).toBe(true);
  });

  it('is true for legacy viewer', () => {
    expect(isTasksAndProfileOnlyUser('viewer')).toBe(true);
  });

  it('is true for a customer participant without elevated membership', () => {
    expect(isTasksAndProfileOnlyUser('customer', [{ role: 'contributor' }])).toBe(
      true,
    );
  });

  it('is false for a customer who is admin on a project', () => {
    expect(isTasksAndProfileOnlyUser('customer', [{ role: 'admin' }])).toBe(false);
  });

  it('is false for platform_admin', () => {
    expect(isTasksAndProfileOnlyUser('platform_admin')).toBe(false);
  });
});

describe('isProjectContributorRole', () => {
  it('is true for contributor', () => {
    expect(isProjectContributorRole('contributor')).toBe(true);
  });

  it('is true for legacy viewer', () => {
    expect(isProjectContributorRole('viewer')).toBe(true);
  });

  it('is false for admin', () => {
    expect(isProjectContributorRole('admin')).toBe(false);
  });
});

describe('isTasksPageFilterAdmin', () => {
  it.each(['platform_admin', 'consultant_manager'])('is true for %s', (role) => {
    expect(isTasksPageFilterAdmin(role)).toBe(true);
  });

  it('is true for legacy admin (normalized to platform_admin)', () => {
    expect(isTasksPageFilterAdmin('admin')).toBe(true);
  });

  it.each(['consultant', 'contributor', 'customer', 'auditor'])(
    'is false for %s',
    (role) => {
      expect(isTasksPageFilterAdmin(role)).toBe(false);
    },
  );
});

describe('isAssignmentOtpPlatformUser', () => {
  it.each(['contributor', 'customer'])('is true for %s', (role) => {
    expect(isAssignmentOtpPlatformUser(role)).toBe(true);
  });

  it('is true for legacy viewer (normalized to contributor)', () => {
    expect(isAssignmentOtpPlatformUser('viewer')).toBe(true);
  });

  it.each(['platform_admin', 'consultant_manager', 'consultant', 'auditor'])(
    'is false for %s',
    (role) => {
      expect(isAssignmentOtpPlatformUser(role)).toBe(false);
    },
  );
});

describe('projectMemberRoleForSelect', () => {
  it.each(['admin', 'editor', 'auditor'] as const)('returns %s unchanged', (role) => {
    expect(projectMemberRoleForSelect(role)).toBe(role);
  });

  it('maps legacy viewer -> contributor', () => {
    expect(projectMemberRoleForSelect('viewer')).toBe('contributor');
  });

  it('defaults unknown roles to contributor', () => {
    expect(projectMemberRoleForSelect('whatever')).toBe('contributor');
    expect(projectMemberRoleForSelect(undefined)).toBe('contributor');
  });
});

describe('isPlatformAdminRole', () => {
  it('is true for platform_admin', () => {
    expect(isPlatformAdminRole('platform_admin')).toBe(true);
  });

  it('is true for legacy admin', () => {
    expect(isPlatformAdminRole('admin')).toBe(true);
  });

  it('is false for consultant_manager', () => {
    expect(isPlatformAdminRole('consultant_manager')).toBe(false);
  });
});

describe('canListAllProjects', () => {
  it.each(['platform_admin', 'consultant_manager'])('is true for %s', (role) => {
    expect(canListAllProjects(role)).toBe(true);
  });

  it('is true for legacy admin', () => {
    expect(canListAllProjects('admin')).toBe(true);
  });

  it.each(['consultant', 'contributor', 'customer', 'auditor'])(
    'is false for %s',
    (role) => {
      expect(canListAllProjects(role)).toBe(false);
    },
  );
});

describe('platformUserVisibleForProject (multi-tenant isolation)', () => {
  it('is always true for non-customer roles', () => {
    expect(
      platformUserVisibleForProject({ role: 'consultant', customerId: 'A' }, 'B'),
    ).toBe(true);
  });

  it('is true for a customer matching the project customer', () => {
    expect(
      platformUserVisibleForProject({ role: 'customer', customerId: 'A' }, 'A'),
    ).toBe(true);
  });

  it('is false for a customer on a different customer', () => {
    expect(
      platformUserVisibleForProject({ role: 'customer', customerId: 'A' }, 'B'),
    ).toBe(false);
  });

  it('is true when the project has no customer id', () => {
    expect(
      platformUserVisibleForProject({ role: 'customer', customerId: 'A' }, null),
    ).toBe(true);
  });
});

describe('platformUserCustomerIdMismatchForProject (multi-tenant isolation)', () => {
  it('is true for a customer belonging to a different company', () => {
    expect(
      platformUserCustomerIdMismatchForProject(
        { role: 'customer', customerId: 'A' },
        'B',
      ),
    ).toBe(true);
  });

  it('is false for a matching customer', () => {
    expect(
      platformUserCustomerIdMismatchForProject(
        { role: 'customer', customerId: 'A' },
        'A',
      ),
    ).toBe(false);
  });

  it('is false when the customer has no customerId', () => {
    expect(
      platformUserCustomerIdMismatchForProject(
        { role: 'customer', customerId: null },
        'B',
      ),
    ).toBe(false);
  });

  it('is false when the project has no customer id', () => {
    expect(
      platformUserCustomerIdMismatchForProject(
        { role: 'customer', customerId: 'A' },
        null,
      ),
    ).toBe(false);
  });

  it('is false for a non-customer role', () => {
    expect(
      platformUserCustomerIdMismatchForProject(
        { role: 'consultant', customerId: 'A' },
        'B',
      ),
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { filterAccessibleKnowledgeBases } from '../../src/features/knowledge-base/lib/filterAccessibleKbs';
import type { KnowledgeBase, PlatformUser, Project } from '../../src/types';

const baseKb = (overrides: Partial<KnowledgeBase> = {}): KnowledgeBase => ({
  id: 'kb-1',
  name: 'KB',
  description: '',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const contributor: PlatformUser = {
  id: 'user-1',
  name: 'User',
  role: 'contributor',
  email: 'u@test.com',
  department: '',
  customerId: 'cust-1',
  createdAt: 0,
};

const userProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'P1',
    domainIds: ['dom-1'],
    customerId: 'cust-1',
    category: 'Project',
    status: 'active',
    createdAt: 0,
  },
];

describe('filterAccessibleKnowledgeBases', () => {
  it('allows platform_admin to see all KBs', () => {
    const admin: PlatformUser = { ...contributor, role: 'platform_admin' };
    const kbs = [
      baseKb({ id: 'kb-other', customerId: 'other' }),
      baseKb({ id: 'kb-general' }),
    ];
    expect(filterAccessibleKnowledgeBases(kbs, admin, [])).toHaveLength(2);
  });

  it('matches customer, project, domain, and general KBs for contributors', () => {
    const kbs = [
      baseKb({ id: 'kb-customer', customerId: 'cust-1' }),
      baseKb({ id: 'kb-project', projectId: 'proj-1' }),
      baseKb({ id: 'kb-domain', domainIds: ['dom-1'] }),
      baseKb({ id: 'kb-general' }),
      baseKb({ id: 'kb-hidden', customerId: 'other' }),
    ];
    const visible = filterAccessibleKnowledgeBases(kbs, contributor, userProjects);
    expect(visible.map((k) => k.id)).toEqual([
      'kb-customer',
      'kb-project',
      'kb-domain',
      'kb-general',
    ]);
  });
});

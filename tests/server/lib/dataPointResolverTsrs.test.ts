import { describe, expect, it } from 'vitest';
import { DataPointResolver } from '../../../server/services/compliance/DataPointResolver.ts';
import { makeTsrsDataPointKey } from '../../../server/lib/tsrsDataPointKey.ts';

describe('DataPointResolver TSRS paragraph refs', () => {
  const projectQuestions = [
    {
      _id: 'q-governance-1',
      projectId: 'proj-1',
      tsrs1: 'Par.26',
      tsrs2: '',
      kod: 'GRI 3-3',
    },
    {
      _id: 'q-scope1-1',
      projectId: 'proj-1',
      tsrs1: '',
      tsrs2: 'Par.29a-i1',
      kod: 'GRI 305-1',
    },
    {
      _id: 'q-unanswered',
      projectId: 'proj-1',
      tsrs1: 'Par.45',
      tsrs2: '',
      kod: 'GRI 3-3',
    },
  ];

  const answers = [
    {
      _id: 'ans-1',
      projectId: 'proj-1',
      questionId: 'q-governance-1',
      latestAnswer: 'Yönetim kurulu iklim risklerini üç ayda bir değerlendirir.',
      submittedAt: new Date('2025-01-01'),
    },
    {
      _id: 'ans-2',
      projectId: 'proj-1',
      questionId: 'q-scope1-1',
      latestAnswer: '12.450',
      submittedAt: new Date('2025-01-02'),
    },
    {
      _id: 'ans-3',
      projectId: 'proj-1',
      questionId: 'q-unanswered',
      latestAnswer: '   ',
      submittedAt: new Date('2025-01-03'),
    },
  ];

  const resolver = new DataPointResolver('proj-1', {}, answers, [], [], projectQuestions);

  it('resolves TSRS 1 paragraph when a mapped question has a non-empty answer', async () => {
    const key = makeTsrsDataPointKey('tsrs_1', 'Par.26');
    const point = await resolver.resolve(key);
    expect(point).not.toBeNull();
    expect(point?.value).toContain('Yönetim kurulu');
    expect(point?.source).toBe('project_question_answer');
  });

  it('resolves TSRS 2 paragraph from project question mapping', async () => {
    const key = makeTsrsDataPointKey('tsrs_2', 'Par.29a-i1');
    const point = await resolver.resolve(key);
    expect(point).not.toBeNull();
    expect(point?.value).toBe(12.45);
  });

  it('returns null when mapped questions exist but answers are blank', async () => {
    const key = makeTsrsDataPointKey('tsrs_1', 'Par.45');
    expect(await resolver.hasDataPoint(key)).toBe(false);
  });

  it('returns null for unmapped TSRS paragraph refs', async () => {
    const key = makeTsrsDataPointKey('tsrs_1', 'Par.99');
    expect(await resolver.resolve(key)).toBeNull();
  });

  it('falls back to emission entries for alternate keys on TSRS 2 metrics', async () => {
    const emissionsResolver = new DataPointResolver(
      'proj-1',
      {},
      [],
      [
        {
          _id: 'em-1',
          scope: 'Scope 1',
          latest: true,
          total: 8800,
          updatedAt: new Date('2025-02-01'),
        },
      ],
      [],
      projectQuestions
    );

    expect(await emissionsResolver.hasDataPoint('scope1_emissions')).toBe(true);
  });
});

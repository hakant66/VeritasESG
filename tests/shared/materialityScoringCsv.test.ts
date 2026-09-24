/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  applyMaterialityCsvImport,
  parseMaterialityScoresCsv,
} from '../../src/lib/materialityScoringCsv.ts';

describe('materialityScoringCsv', () => {
  it('parses semicolon CSV with English headers', () => {
    const csv = [
      'id;subject;financialImpact;impactSeverity;probability;stakeholderConcern;isMaterial',
      'row-1;Climate;4;3;2;5;1',
      'row-2;Water;1;1;1;1;0',
    ].join('\n');
    const rows = parseMaterialityScoresCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'row-1',
      subject: 'Climate',
      financialImpact: 4,
      stakeholderConcern: 5,
      isMaterial: true,
    });
  });

  it('applies import by id and subject', () => {
    const existing = [
      {
        id: 'a1',
        subject: 'Climate',
        financialImpact: 0,
        impactSeverity: 0,
        probability: 0,
        stakeholderConcern: 0,
        isMaterial: false,
      },
      {
        id: 'a2',
        subject: 'Water',
        financialImpact: 0,
        impactSeverity: 0,
        probability: 0,
        stakeholderConcern: 0,
        isMaterial: false,
      },
    ];
    const { rows, matched, unmatched } = applyMaterialityCsvImport(existing, [
      { id: 'a1', financialImpact: 5, impactSeverity: 4, probability: 3, stakeholderConcern: 2 },
      { subject: 'Water', financialImpact: 1, impactSeverity: 1, probability: 1, stakeholderConcern: 1 },
      { subject: 'Unknown', financialImpact: 5, impactSeverity: 5, probability: 5, stakeholderConcern: 5 },
    ]);
    expect(matched).toBe(2);
    expect(unmatched).toBe(1);
    expect(rows[0].financialImpact).toBe(5);
    expect(rows[0].isMaterial).toBe(true);
    expect(rows[1].financialImpact).toBe(1);
  });
});

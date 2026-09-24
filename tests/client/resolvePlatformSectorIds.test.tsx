import { describe, expect, it } from 'vitest';
import { resolvePlatformSectorIds } from '../../src/lib/resolvePlatformSectorIds';

const sectors = [
  { id: 'chem-id', name: 'Kimyevi Maddeler' },
  { id: 'auto-id', name: 'Otomotiv Endüstrisi' },
  { id: 'other-id', name: 'Diğer' },
];

describe('resolvePlatformSectorIds', () => {
  it('maps NACE C20 to Kimyevi Maddeler sector', () => {
    const ids = resolvePlatformSectorIds(sectors, {
      naceCode: 'C20',
      naceDescription: 'Kimyasalların imalatı',
    });
    expect(ids).toEqual(['chem-id']);
  });

  it('maps chemical description text to chem sector', () => {
    const ids = resolvePlatformSectorIds(sectors, {
      naceDescription: 'kimya sektöründe faaliyet',
    });
    expect(ids).toEqual(['chem-id']);
  });
});

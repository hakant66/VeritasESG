import { describe, expect, it } from 'vitest';
import { buildClonedTemplateName } from '../../src/lib/cloneTemplate';

describe('buildClonedTemplateName', () => {
  it('appends Kopya suffix to base name', () => {
    expect(buildClonedTemplateName('Kimya Şablonu')).toBe('Kimya Şablonu (Kopya)');
  });

  it('increments existing Kopya suffix', () => {
    expect(buildClonedTemplateName('Kimya Şablonu (Kopya)')).toBe(
      'Kimya Şablonu (Kopya 2)',
    );
    expect(buildClonedTemplateName('Kimya Şablonu (Kopya 2)')).toBe(
      'Kimya Şablonu (Kopya 3)',
    );
  });
});

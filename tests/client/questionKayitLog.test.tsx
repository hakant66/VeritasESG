import { describe, expect, it } from 'vitest';
import {
  appendQuestionKayitLine,
  buildAppendedQuestionKayit,
  diffQuestionKayitSnapshots,
  formatQuestionKayitLine,
} from '../../src/lib/questionKayitLog';

describe('questionKayitLog', () => {
  it('formats change lines with timestamp and actor', () => {
    const line = formatQuestionKayitLine({
      timestamp: new Date('2026-06-06T10:15:00').getTime(),
      actor: { email: 'taskin.baba@gmail.com', name: 'Hakan' },
      changes: ['Dayanak: (boş) → BÖLÜM 1'],
    });
    expect(line).toContain('taskin.baba@gmail.com');
    expect(line).toContain('Dayanak: (boş) → BÖLÜM 1');
    expect(line).toMatch(/\[06\.06\.2026/);
  });

  it('diffs snapshots and appends to previous kayit', () => {
    const before = { dayanak: '', bolum: '1', kod: 'T1' };
    const after = { dayanak: 'Yeni dayanak', bolum: '1', kod: 'T1' };
    const changes = diffQuestionKayitSnapshots(before, after);
    expect(changes).toEqual(['Dayanak: (boş) → Yeni dayanak']);

    const kayit = buildAppendedQuestionKayit({
      previousKayit: '[01.01.2026] eski@mail.com — Kod: A → B',
      timestamp: Date.UTC(2026, 5, 6, 8, 0, 0),
      actor: { email: 'user@example.com' },
      before,
      after,
    });
    expect(kayit).toContain('eski@mail.com');
    expect(kayit).toContain('user@example.com');
    expect(kayit).toContain('Dayanak: (boş) → Yeni dayanak');
  });

  it('appends lines chronologically at the end', () => {
    const next = appendQuestionKayitLine('satır-1', 'satır-2');
    expect(next).toBe('satır-1\nsatır-2');
  });
});

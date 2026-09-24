import { describe, expect, it } from 'vitest';
import { chunkText, splitIntoParagraphs } from '../../../server/lib/rag/chunkText.ts';

describe('splitIntoParagraphs', () => {
  it('splits on blank lines', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird.';
    expect(splitIntoParagraphs(text)).toEqual([
      'First paragraph.',
      'Second paragraph.',
      'Third.',
    ]);
  });
});

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const text = 'Short sustainability note.';
    expect(chunkText(text, { targetChars: 500, overlapChars: 50 })).toEqual([text]);
  });

  it('merges paragraphs until target size', () => {
    const p1 = 'A'.repeat(400);
    const p2 = 'B'.repeat(400);
    const p3 = 'C'.repeat(400);
    const chunks = chunkText(`${p1}\n\n${p2}\n\n${p3}`, {
      targetChars: 900,
      overlapChars: 0,
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toContain('A');
    expect(chunks.join('')).toContain('C');
  });
});

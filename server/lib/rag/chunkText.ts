/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getChunkOverlapChars, getChunkTargetChars } from './constants.ts';

const MIN_CHUNK_CHARS = 80;

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
}

/** Split on paragraph boundaries while keeping markdown-style headings attached. */
export function splitIntoParagraphs(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const rawBlocks = normalized.split(/\n{2,}/);
  const paragraphs: string[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    paragraphs.push(trimmed);
  }

  if (paragraphs.length === 0 && normalized) {
    paragraphs.push(normalized);
  }

  return paragraphs;
}

function takeOverlapTail(text: string, overlapChars: number) {
  if (overlapChars <= 0 || text.length <= overlapChars) return text;
  return text.slice(-overlapChars);
}

/**
 * Merge paragraphs into chunks near `targetChars`, with optional tail overlap between chunks.
 */
export function chunkText(
  text: string,
  options?: { targetChars?: number; overlapChars?: number },
): string[] {
  const targetChars = options?.targetChars ?? getChunkTargetChars();
  const overlapChars = options?.overlapChars ?? getChunkOverlapChars();
  const paragraphs = splitIntoParagraphs(text);

  if (paragraphs.length === 0) return [];
  if (paragraphs.join('\n\n').length <= targetChars) {
    return [paragraphs.join('\n\n')];
  }

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length >= MIN_CHUNK_CHARS) {
      chunks.push(trimmed);
    } else if (trimmed && chunks.length > 0) {
      const merged = `${chunks[chunks.length - 1]}\n\n${trimmed}`;
      if (merged.length <= targetChars) {
        chunks[chunks.length - 1] = merged;
      } else {
        chunks.push(trimmed);
      }
    } else if (trimmed) {
      chunks.push(trimmed);
    }
    current = '';
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= targetChars) {
      current = candidate;
      continue;
    }

    if (current) {
      flush();
      const overlap = chunks.length > 0 ? takeOverlapTail(chunks[chunks.length - 1], overlapChars) : '';
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
      if (current.length > targetChars) {
        flush();
        if (paragraph.length > targetChars) {
          for (let i = 0; i < paragraph.length; i += targetChars - overlapChars) {
            const slice = paragraph.slice(i, i + targetChars);
            if (slice.trim().length >= MIN_CHUNK_CHARS) chunks.push(slice.trim());
          }
          current = '';
        } else {
          current = paragraph;
        }
      }
      continue;
    }

    if (paragraph.length > targetChars) {
      for (let i = 0; i < paragraph.length; i += targetChars - overlapChars) {
        const slice = paragraph.slice(i, i + targetChars);
        if (slice.trim().length >= MIN_CHUNK_CHARS) chunks.push(slice.trim());
      }
    } else {
      current = paragraph;
    }
  }

  if (current.trim()) flush();

  const capped: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= targetChars) {
      capped.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += targetChars - overlapChars) {
      const slice = chunk.slice(i, i + targetChars).trim();
      if (slice.length >= MIN_CHUNK_CHARS) capped.push(slice);
    }
  }

  return capped.filter((c) => c.trim().length > 0);
}
